import { Job } from 'bullmq';
import { query } from 'db';
import { substituteVariables, createLLMClient, stripMarkdownForLinkedIn } from 'generate';
import { generatePostImage } from 'image-gen';
import { insertJobRun, updateJobRun } from '../lib/jobRuns.js';

export type GenerateJobPayload = {
  workspaceId: string;
  draftId?: string;
  trendItemId?: string;
  topicIds?: string[];
  postType?: string;
  viewpointId?: string;
};

export async function processGenerateJob(job: Job<GenerateJobPayload>) {
  const { workspaceId, trendItemId, postType, viewpointId } = job.data;
  const runId = await insertJobRun(workspaceId, 'generate', { referenceId: job.id, triggerType: 'api' });
  try {
  let title = '';
  let summary = '';
  let source = '';
  if (trendItemId) {
    const { rows } = await query<{ title: string; summary: string | null; url: string }>(
      'SELECT title, summary, url FROM trend_items WHERE id = $1 AND workspace_id = $2',
      [trendItemId, workspaceId]
    );
    if (rows.length === 0) { await updateJobRun(runId, 'failed', { errorMessage: 'Trend item not found' }); return { processed: false }; }
    title = rows[0].title;
    summary = rows[0].summary ?? '';
    source = rows[0].url;
  }

  let viewpointInstruction = '';
  if (viewpointId) {
    const { rows: vb } = await query<{ name: string; slug: string }>(
      'SELECT name, slug FROM topic_bundles WHERE id = $1 AND workspace_id = $2',
      [viewpointId, workspaceId]
    );
    if (vb.length > 0) {
      viewpointInstruction = ` Write for the ${vb[0].name} audience (viewpoint: ${vb[0].slug}).`;
    }
  }

  const tone = 'professional';
  const template = `Write a short LinkedIn post (under 3000 chars). Title: {{title}}. Summary: {{summary}}. Source: {{source}}. Tone: {{tone}}.{{viewpoint}}`;
  const body = substituteVariables(template, { title, summary, source, tone, viewpoint: viewpointInstruction });
  const llm = createLLMClient();
  const systemPrompt = 'You are a LinkedIn content writer. Write plain text only -- do NOT use markdown formatting like **bold**, *italic*, or [links](url). Use line breaks and hashtags for structure. At the end of your response, on a new line, write ONLY a number 0-100 for confidence score (e.g. CONFIDENCE: 85).';
  const rawContent = await llm.complete(body, systemPrompt);
  let content = stripMarkdownForLinkedIn(rawContent);
  let confidenceScore: number | null = null;
  const confMatch = rawContent.match(/\bCONFIDENCE:\s*(\d{1,3})\b/i) || rawContent.match(/\b(\d{1,3})\s*%\s*confidence/i);
  if (confMatch) confidenceScore = Math.min(1, Math.max(0, parseInt(confMatch[1], 10) / 100));
  else confidenceScore = 0.7;
  content = content.replace(/\n?\s*CONFIDENCE:\s*\d{1,3}\s*$/i, '').replace(/\n?\s*\d{1,3}\s*%\s*confidence\s*$/i, '').trim();
  const { rows: templates } = await query<{ id: string }>(
    'SELECT id FROM prompt_templates WHERE workspace_id = $1 AND post_type = $2 LIMIT 1',
    [workspaceId, postType ?? 'insight']
  );
  const templateId = templates[0]?.id ?? null;
  const { rows: users } = await query<{ id: string }>('SELECT id FROM users LIMIT 1');
  const createdBy = users[0]?.id ?? '';
  const { rows: inserted } = await query<{ id: string }>(
    `INSERT INTO draft_posts (workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, confidence_score, created_by)
     VALUES ($1, $2, NULL, $3, 'linkedin', $4, $5, $6, 'pending_review', $7, $8) RETURNING id`,
    [workspaceId, trendItemId ?? null, viewpointId ?? null, content, postType ?? 'insight', templateId, confidenceScore, createdBy]
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

  await updateJobRun(runId, 'completed');
  return { processed: true, draftId };
  } catch (err) {
    await updateJobRun(runId, 'failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
