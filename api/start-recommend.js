export const config = { runtime: 'nodejs' };
export const maxDuration = 60;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isHomeArea(candidate, origin) {
  const name = normalize(candidate.name);
  const region = normalize(candidate.region);
  const originRegion = normalize(origin?.region);
  const nearDc = ['washington dc', 'arlington virginia', 'old town alexandria', 'alexandria'].some(x => name.includes(x));
  return (originRegion === 'va' || originRegion === 'dc') && (candidate.distance <= 55 || nearDc || region === 'dc');
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
    environments: (c.environments || []).slice(0, 4),
    activities: (c.activities || []).slice(0, 6),
    lodging: (c.lodging || []).slice(0, 4),
    days: [c.idealMinDays, c.idealMaxDays],
    sleepNight: c.sleepBudgetPerNight,
  };
}

function buildSmartCandidateSet(candidates, origin, answers) {
  const all = Array.isArray(candidates) ? candidates : [];
  const selected = [];
  const seen = new Set();
  const duration = Array.isArray(answers?.duration) ? answers.duration[0] : answers?.duration;
  const allowClose = duration === '2-4 days';

  function add(candidate) {
    if (!candidate?.name) return;
    const key = normalize(candidate.name);
    if (seen.has(key)) return;
    if (!allowClose && isHomeArea(candidate, origin)) return;
    seen.add(key);
    selected.push(compactCandidate(candidate));
  }

  all.slice(0, 70).forEach(add);

  const categories = ['beach', 'city', 'lake', 'woods', 'mountain', 'desert', 'historic', 'sports', 'theme', 'island', 'remote', 'wine', 'ski', 'resort'];
  for (const category of categories) {
    const match = all.find(c => normalize(c.category).includes(category) || (c.environments || []).some(e => normalize(e).includes(category)));
    add(match);
  }

  const distanceBands = [
    [80, 250],
    [250, 450],
    [450, 700],
    [700, 1100],
    [1100, 1800],
    [1800, 2600],
    [2600, 99999],
  ];
  for (const [min, max] of distanceBands) {
    all.filter(c => c.distance >= min && c.distance <= max).slice(0, 2).forEach(add);
  }

  return selected.slice(0, 36);
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
    const safeCandidates = buildSmartCandidateSet(candidates, origin, answers);

    const prompt = `You are the AI brain for a vacation destination generator. The app is only the sensory input: it collected the user's answers, starting ZIP, distance estimates, and a compact candidate set from a 500-place destination database. You make the final decision.

Your job: choose the best 3 vacation destinations for this exact user. Do not simply repeat the local score order. Local scores are weak signals, not final answers.

Hard rules:
- Think independently from the user's answers.
- Use the compact candidate set as the main destination universe, but you may go outside it if it is clearly missing the best answer.
- Do not over-recommend places near the user's home just because they are close. Nearby places should only win for very short/local trips or if the user clearly asked for that vibe.
- If the user is leaving from Northern Virginia / DC area and asks for a real vacation, Washington DC, Arlington, and Alexandria should usually be treated as home-area day trips, not top vacation picks.
- Match trip length, travel method, travel range, lodging budget, environment, sleep type, activities, group type, pace, climate, crowds, nightlife, famous-vs-hidden preference, and dealbreakers.
- Use web search for current lodging reality, season/weather practicality, big events, safety/practical travel issues, and whether the trip length makes sense.
- The sleep budget is ONLY for lodging per night. Do not treat it as total daily vacation spending.
- Be direct. Do not recommend a famous place just because it is famous.
- Return strict JSON only. No markdown. No surrounding explanation.

Origin:
${JSON.stringify(origin, null, 2)}

User answers:
${JSON.stringify(answers, null, 2)}

Compact candidate set:
${JSON.stringify(safeCandidates, null, 2)}

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

    const aiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        background: true,
        reasoning: { effort: 'high' },
        tools: [{ type: 'web_search', search_context_size: 'medium' }],
        max_output_tokens: 1800,
        input: prompt,
      }),
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
