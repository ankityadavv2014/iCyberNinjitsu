import { Job } from 'bullmq';
import { query } from 'db';
import { substituteVariables, createLLMClient, stripMarkdownForLinkedIn } from 'generate';
import { generatePostImage } from 'image-gen';

export type GenerateJobPayload = {
  workspaceId: string;
  draftId?: string;
  trendItemId?: string;
  topicIds?: string[];
  postType?: string;
};

export async function processGenerateJob(job: Job<GenerateJobPayload>) {
  const { workspaceId, trendItemId, postType } = job.data;
  let title = '';
  let summary = '';
  let source = '';
  if (trendItemId) {
    const { rows } = await query<{ title: string; summary: string | null; url: string }>(
      'SELECT title, summary, url FROM trend_items WHERE id = $1 AND workspace_id = $2',
      [trendItemId, workspaceId]
    );
    if (rows.length === 0) return { processed: false };
    title = rows[0].title;
    summary = rows[0].summary ?? '';
    source = rows[0].url;
  }
  const tone = 'professional';
  const template = `Write a short LinkedIn post (under 3000 chars). Title: {{title}}. Summary: {{summary}}. Source: {{source}}. Tone: {{tone}}.`;
  const body = substituteVariables(template, { title, summary, source, tone });
  const llm = createLLMClient();
  const rawContent = await llm.complete(body, 'You are a LinkedIn content writer. Write plain text only -- do NOT use markdown formatting like **bold**, *italic*, or [links](url). Use line breaks and hashtags for structure.');
  // Strip any markdown the LLM still includes (LinkedIn renders text literally)
  const content = stripMarkdownForLinkedIn(rawContent);
  const { rows: templates } = await query<{ id: string }>(
    'SELECT id FROM prompt_templates WHERE workspace_id = $1 AND post_type = $2 LIMIT 1',
    [workspaceId, postType ?? 'insight']
  );
  const templateId = templates[0]?.id ?? null;
  const { rows: users } = await query<{ id: string }>('SELECT id FROM users LIMIT 1');
  const createdBy = users[0]?.id ?? '';
  const { rows: inserted } = await query<{ id: string }>(
    `INSERT INTO draft_posts (workspace_id, trend_item_id, content, post_type, template_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'pending_review', $6) RETURNING id`,
    [workspaceId, trendItemId ?? null, content, postType ?? 'insight', templateId, createdBy]
  );
  const draftId = inserted[0]?.id;

  // Generate a post image in the background (don't block draft creation)
  if (draftId) {
    generatePostImage({
      postContent: content,
      headline: title || undefined,
      sourceTitle: title || undefined,
      sourceUrl: source || undefined,
      method: 'auto',
    })
      .then(async (img) => {
        await query(
          `INSERT INTO post_images (workspace_id, draft_post_id, image_data, generation_method, prompt, width, height)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [workspaceId, draftId, img.buffer, img.method, img.prompt ?? null, img.width, img.height]
        );
        console.log(`[generate] Image created for draft ${draftId} (method: ${img.method}, ${img.width}x${img.height})`);
      })
      .catch((err) => {
        console.warn(`[generate] Image generation failed for draft ${draftId}:`, err instanceof Error ? err.message : String(err));
      });
  }

  return { processed: true, draftId };
}
