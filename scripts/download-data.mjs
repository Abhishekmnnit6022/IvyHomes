// One-off data auditor that downloads every live API collection for analysis.
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = 'https://solve.ivy.homes';
const apiKey = process.env.IVY_API_KEY;
const password = process.env.IVY_DEMO_PASSWORD;

if (!apiKey || !password) throw new Error('Set IVY_API_KEY and IVY_DEMO_PASSWORD.');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

const session = await request('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo1@ivy.homes', password }),
});
const auth = { Authorization: `Bearer ${session.access_token}` };

async function downloadCollection(name) {
  let offset = 0;
  const limit = 200;
  const records = [];
  while (true) {
    const page = await request(`/v1/${name}?limit=${limit}&offset=${offset}`, { headers: auth });
    records.push(...page.results);
    console.log(`${name}: ${records.length}/${page.total}`);
    if (!page.has_more) return { meta: { limit: page.limit, offset: 0, total: page.total }, results: records };
    offset += page.limit;
  }
}

await mkdir('data', { recursive: true });
for (const name of ['listings', 'rentals', 'projects']) {
  const data = await downloadCollection(name);
  await writeFile(`data/${name}.json`, JSON.stringify(data, null, 2));
}
const summary = await request('/v1/analytics/summary', { headers: auth });
await writeFile('data/summary.json', JSON.stringify(summary, null, 2));
await writeFile('data/live-api-notes.json', JSON.stringify({
  sampledAt: new Date().toISOString(),
  auth: { expires_in: session.expires_in, has_refresh_token: Boolean(session.refresh_token), refresh_url: session.refresh_url },
}, null, 2));
