import { buildTextPostPayload, buildImagePostPayload, type LinkedInPostPayload } from './postPayload.js';

const LI_HEADERS = {
  'LinkedIn-Version': '202510',
  'X-Restli-Protocol-Version': '2.0.0',
};

export interface LinkedInClientConfig {
  accessToken: string;
}

export interface PostResult {
  success: boolean;
  status?: number;
  body?: string;
  error?: string;
  postUrn?: string;
}

export interface ImageUploadResult {
  success: boolean;
  imageUrn?: string;
  error?: string;
}

export function createLinkedInClient(config: LinkedInClientConfig) {
  const authHeaders = {
    Authorization: `Bearer ${config.accessToken}`,
    ...LI_HEADERS,
  };

  return {
    /**
     * Post a text-only commentary.
     */
    async postCommentary(urn: string, commentary: string, imageUrn?: string): Promise<PostResult> {
      const payload = imageUrn
        ? buildImagePostPayload({ authorUrn: urn, commentary, imageUrn })
        : buildTextPostPayload({ authorUrn: urn, commentary });

      const res = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      if (res.ok) {
        const postUrn = res.headers.get('x-restli-id') ?? undefined;
        return { success: true, status: res.status, body, postUrn };
      }
      return { success: false, status: res.status, body, error: body };
    },

    /**
     * Upload an image to LinkedIn and get an image URN for use in posts.
     * Uses the LinkedIn Images API (initialize upload + PUT binary).
     */
    async uploadImage(ownerUrn: string, imageBuffer: Buffer): Promise<ImageUploadResult> {
      // Step 1: Initialize upload
      const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: ownerUrn,
          },
        }),
      });

      if (!initRes.ok) {
        const errBody = await initRes.text();
        return { success: false, error: `Init upload failed (${initRes.status}): ${errBody.slice(0, 500)}` };
      }

      const initData = await initRes.json() as {
        value?: {
          uploadUrl?: string;
          image?: string;
        };
      };

      const uploadUrl = initData.value?.uploadUrl;
      const imageUrn = initData.value?.image;

      if (!uploadUrl || !imageUrn) {
        return { success: false, error: 'Missing uploadUrl or image URN from init response' };
      }

      // Step 2: Upload binary image
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        return { success: false, error: `Image upload failed (${uploadRes.status}): ${errBody.slice(0, 500)}` };
      }

      return { success: true, imageUrn };
    },

    /**
     * Delete a post from LinkedIn.
     * Requires the post URN (e.g. urn:li:share:123 or urn:li:ugcPost:123).
     */
    async deletePost(postUrn: string): Promise<{ success: boolean; error?: string }> {
      const encodedUrn = encodeURIComponent(postUrn);
      const res = await fetch(`https://api.linkedin.com/rest/posts/${encodedUrn}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (res.ok || res.status === 204) {
        return { success: true };
      }

      const body = await res.text();
      return { success: false, error: `Delete failed (${res.status}): ${body.slice(0, 500)}` };
    },
  };
}
