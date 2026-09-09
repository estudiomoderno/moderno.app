try {
  const config = JSON.parse(process.env.GOOGLE_CONFIG);
  for (const value of Object.values(config)) {
    if (typeof value !== 'string' || !value || /[\r\n]/.test(value)) throw new Error('Invalid config');
    console.log(`::add-mask::${value}`);
  }
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set('audience', config.provider);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!response.ok) throw new Error('OIDC unavailable');
  const { value } = await response.json();
  const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
  // Only the public repository/branch identity is printed, never the JWT.
  console.log(`OIDC subject: ${claims.sub}`);
} catch {
  console.error('Cannot prepare backup identity.');
  process.exitCode = 1;
}
