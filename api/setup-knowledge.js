export const config = { runtime: 'nodejs' };
export const maxDuration = 60;

import fs from 'node:fs/promises';
import { Blob } from 'node:buffer';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body, null, 2));
}

function authorized(req) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) return false;

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const supplied = url.searchParams.get('secret') || req.headers['x-setup-secret'];
  return supplied === expected;
}

async function openai(path, options = {}) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return data;
}

function buildKnowledgeText(destinations) {
  return destinations.map((d, index) => {
    const scores = d.tagScores || {};
    const strongScores = Object.entries(scores)
      .filter(([, value]) => Number(value) >= 4)
      .map(([key, value]) => `${key}:${value}`)
      .join(', ');

    return [
      `Destination ${index + 1}: ${d.name}`,
      `Region: ${d.region || ''}`,
      `Country: ${d.country || ''}`,
      `Domestic: ${Boolean(d.domestic)}`,
      `Category: ${d.category || ''}`,
      `Environment tags: ${(d.environments || []).join(', ')}`,
      `Activities: ${(d.activities || []).join(', ')}`,
      `Lodging: ${(d.lodging || []).join(', ')}`,
      `Ideal trip length: ${d.idealMinDays || ''}-${d.idealMaxDays || ''} days`,
      `Typical sleep-only lodging target: $${d.sleepBudgetPerNight || ''} per night`,
      `Latitude/longitude: ${d.lat || ''}, ${d.lon || ''}`,
      `Season tags: ${(d.seasonTags || []).join(', ')}`,
      `Trip style tags: ${(d.tripStyleTags || []).join(', ')}`,
      `Strong 0-5 trait scores: ${strongScores}`,
      `All 0-5 trait scores: ${JSON.stringify(scores)}`,
      `Master notes: ${d.masterNotes || ''}`,
    ].join('\n');
  }).join('\n\n---\n\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    json(res, 405, { error: 'Use GET or POST.' });
    return;
  }

  if (!authorized(req)) {
    json(res, 401, { error: 'Unauthorized. Add SETUP_SECRET in Vercel, then call this route with ?secret=that_value.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    json(res, 500, { error: 'OPENAI_API_KEY is not set in Vercel.' });
    return;
  }

  try {
    const raw = await fs.readFile(new URL('../data/destinations.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(raw);
    const destinations = Array.isArray(parsed) ? parsed : parsed.destinations;

    if (!Array.isArray(destinations) || !destinations.length) {
      json(res, 500, { error: 'Could not find destinations in data/destinations.json.' });
      return;
    }

    const knowledgeText = buildKnowledgeText(destinations);

    const form = new FormData();
    form.append('purpose', 'assistants');
    form.append('file', new Blob([knowledgeText], { type: 'text/plain' }), 'vacation-destinations-tagged-knowledge.txt');

    const fileResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    const file = await fileResponse.json();
    if (!fileResponse.ok) throw new Error(file.error?.message || JSON.stringify(file));

    const vectorStore = await openai('/vector_stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Vacation Planner Tagged Master DB ${new Date().toISOString()}` }),
    });

    const vectorFile = await openai(`/vector_stores/${vectorStore.id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: file.id }),
    });

    json(res, 200, {
      message: 'Created new OpenAI tagged destination knowledge store.',
      nextStep: 'Copy OPENAI_VECTOR_STORE_ID into Vercel Environment Variables, then redeploy.',
      OPENAI_VECTOR_STORE_ID: vectorStore.id,
      fileId: file.id,
      vectorStoreFileStatus: vectorFile.status,
      destinationCount: destinations.length,
    });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}
