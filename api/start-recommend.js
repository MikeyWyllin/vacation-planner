export const config = { runtime: 'nodejs' };
export const maxDuration = 60;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compactCandidate(c) {
  return {
    name: c.name,
    region: c.region,
    country: c.country,
    domestic: c.domestic,
    miles: c.distance,
    localScore: c.score,
    category: c.category,
    environments: (c.environments || []).slice(0, 3),
    activities: (c.activities || []).slice(0, 4),
    lodging: (c.lodging || []).slice(0, 3),
    days: [c.idealMinDays, c.idealMaxDays],
    sleepNight: c.sleepBudgetPerNight,
  };
}

function envNumber(name, fallback, max) {
  const raw = Number(process.env[name]);
  const value = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  return max ? Math.min(value, max) : value;
}

function envOptionalNumber(name, max) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return max ? Math.min(raw, max) : raw;
}

function envChoice(name, fallback, allowed) {
  const value = String(process.env[name] || fallback).toLowerCase();
  return allowed.includes(value) ? value : fallback;
}

function buildAiCandidateSet(candidates) {
  const all = Array.isArray(candidates) ? candidates : [];
  const candidateLimit = envNumber('AI_CANDIDATE_LIMIT', 500, 500);
  const seen = new Set();
  const selected = [];

  for (const candidate of all) {
    if (!candidate?.name) continue;
    const key = normalize(candidate.name);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(compactCandidate(candidate));
    if (selected.length >= candidateLimit) break;
  }

  return selected;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({ mode: 'no_ai_picks', message: 'OPENAI_API_KEY is not set. No suggestions are shown until AI processes the trip.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { origin, answers, candidates } = body || {};
    const hasVectorStore = Boolean(process.env.OPENAI_VECTOR_STORE_ID);
    const safeCandidates = hasVectorStore ? [] : buildAiCandidateSet(candidates);
    const maxOutputTokens = envOptionalNumber('OPENAI_MAX_OUTPUT_TOKENS', 128000);
    const reasoningEffort = envChoice('OPENAI_REASONING_EFFORT', 'high', ['low', 'medium', 'high']);
    const searchContextSize = envChoice('OPENAI_SEARCH_CONTEXT_SIZE', 'high', ['low', 'medium', 'high']);
    const fileSearchResults = envNumber('OPENAI_FILE_SEARCH_RESULTS', 50, 50);
    const tools = [];

    if (hasVectorStore) {
      tools.push({
        type: 'file_search',
        vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID],
        max_num_results: fileSearchResults,
      });
    }

    tools.push({ type: 'web_search', search_context_size: searchContextSize });

    const knowledgeBlock = hasVectorStore
      ? `Persistent destination knowledge store:
An OpenAI vector store containing the 500+ destination database is attached through file_search. Search it thoroughly as your master destination set before choosing. Do not assume the app's local order is correct.`
      : `Full compact candidate set:
${JSON.stringify(safeCandidates, null, 2)}`;

    const prompt = `You are the AI brain for a vacation destination generator. The app collected the user's answers, starting ZIP, distance estimates, and destination knowledge. You make the final decision.

Your job: choose the best 3 vacation destinations for this exact user. Do not simply repeat the local score order. Local scores are weak signals, not final answers.

Hard rules:
- Think independently from the user's answers. The AI is the brain; the app is only sensory input.
- Use the persistent destination knowledge store or full compact candidate set as the main destination universe, but you may go outside it if web search clearly finds a better answer.
- Spend the reasoning needed to compare distance, trip length, route practicality, lodging fit, activities, season, and tradeoffs before choosing.
- Do not over-recommend places near the user's home just because they are close. Nearby places should only win for very short/local trips or if the user clearly asked for that vibe.
- If the user is leaving from Northern Virginia / DC area and asks for a real vacation, Washington DC, Arlington, and Alexandria should usually be treated as home-area day trips, not top vacation picks.
- Match trip length, travel method, travel range, lodging budget, environment, sleep type, activities, group type, pace, climate, crowds, nightlife, famous-vs-hidden preference, and dealbreakers.
- Use web search only where it changes the final recommendation: lodging reality, season/weather practicality, major events, safety/practical travel issues, and whether the trip length makes sense.
- The sleep budget is ONLY for lodging per night. Do not treat it as total daily vacation spending.
- Be direct. Do not recommend a famous place just because it is famous.
- Return strict JSON only. No markdown. No surrounding explanation.

Origin:
${JSON.stringify(origin, null, 2)}

User answers:
${JSON.stringify(answers, null, 2)}

${knowledgeBlock}

Return this JSON shape:
{
  "summary": "one sentence explaining the type of trip the user is really asking for",
  "picks": [
    {
      "name": "destination name",
      "region": "state, region, or country",
      "country": "country if known",
      "domestic": true,
      "distance": 0,
      "score": 0-100,
      "headline": "short direct headline",
      "reasons": ["reason 1", "reason 2", "reason 3", "reason 4"],
      "warnings": ["tradeoff 1"],
      "travelPlan": "short practical travel note",
      "budgetRead": "short lodging budget note",
      "searchNotes": ["current info checked or uncertainty note"]
    }
  ]
}`;

    const requestBody = {
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      background: true,
      reasoning: { effort: reasoningEffort },
      tools,
      input: prompt,
    };

    if (maxOutputTokens) requestBody.max_output_tokens = maxOutputTokens;

    const aiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await aiRes.json();
    if (!aiRes.ok || !data.id) {
      res.status(200).json({ mode: 'no_ai_picks', message: 'OpenAI did not start the background job.', detail: data.error?.message || data });
      return;
    }

    res.status(200).json({ mode: 'ai_pending', responseId: data.id, status: data.status || 'queued' });
  } catch (err) {
    res.status(200).json({ mode: 'no_ai_picks', message: 'AI background job failed to start.', detail: err.message });
  }
}
