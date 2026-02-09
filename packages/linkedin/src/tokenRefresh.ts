export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn refresh failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; expires_in?: number }>;
}
