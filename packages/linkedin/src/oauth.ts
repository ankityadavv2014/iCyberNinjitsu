export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const scope = (params.scopes ?? ['openid', 'profile', 'w_member_social']).join(' ');
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${q.toString()}`;
}

export async function exchangeCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}
