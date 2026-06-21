import { readFile } from 'node:fs/promises';
import { Blob } from 'node:buffer';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Missing OPENAI_API_KEY.');
  process.exit(1);
}

async function openai(path, options = {}) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return data;
}

const raw = await readFile(new URL('../data/destinations.json', import.meta.url), 'utf8');
const parsed = JSON.parse(raw);
const destinations = Array.isArray(parsed) ? parsed : parsed.destinations;

if (!Array.isArray(destinations)) {
  console.error('Could not find a destination list in data/destinations.json.');
  process.exit(1);
}

const knowledgeText = destinations.map((d, index) => {
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

const form = new FormData();
form.append('purpose', 'assistants');
form.append('file', new Blob([knowledgeText], { type: 'text/plain' }), 'vacation-destinations-knowledge.txt');

const file = await fetch('https://api.openai.com/v1/files', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: form,
}).then(async response => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data;
});

const vectorStore = await openai('/vector_stores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Vacation Planner Master Destination Set' }),
});

const vectorFile = await openai(`/vector_stores/${vectorStore.id}/files`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file_id: file.id }),
});

console.log('Created OpenAI master destination knowledge store.');
console.log(`File ID: ${file.id}`);
console.log(`Vector store file status: ${vectorFile.status}`);
console.log('');
console.log('Add this to Vercel Environment Variables:');
console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
