export interface LinkedInPostPayload {
  author: string;
  lifecycleState: 'PUBLISHED';
  commentary: string;
  visibility: string;
  distribution: {
    feedDistribution: string;
    targetEntities: unknown[];
    thirdPartyDistributionChannels: unknown[];
  };
  isReshareDisabledByAuthor: boolean;
  content?: {
    media?: {
      id: string;
      title?: string;
    };
  };
}

export function buildTextPostPayload(params: { authorUrn: string; commentary: string }): LinkedInPostPayload {
  return {
    author: params.authorUrn,
    commentary: params.commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}

export function buildImagePostPayload(params: { authorUrn: string; commentary: string; imageUrn: string; imageTitle?: string }): LinkedInPostPayload {
  return {
    author: params.authorUrn,
    commentary: params.commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        id: params.imageUrn,
        title: params.imageTitle ?? 'Post image',
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}
