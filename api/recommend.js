export const config = { runtime: 'nodejs' };

function extractText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({ mode: 'local_only', message: 'OPENAI_API_KEY is not set. Frontend local ranking should be used.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { origin, answers, candidates } = body || {};
    const safeCandidates = (candidates || []).slice(0, 500).map(c => ({
      name: c.name,
      region: c.region,
      country: c.country,
      domestic: c.domestic,
      distance: c.distance,
      score: c.score,
      category: c.category,
      environments: c.environments,
      activities: c.activities,
      lodging: c.lodging,
      idealMinDays: c.idealMinDays,
      idealMaxDays: c.idealMaxDays,
      sleepBudgetPerNight: c.sleepBudgetPerNight,
      localReasons: c.localReasons || c.reasons,
      localWarnings: c.localWarnings || c.warnings,
    }));

    const prompt = `You are the AI brain for a vacation destination generator. The app is only the sensory input: it collected the user's answers, starting ZIP, distance estimates, and a 500-place destination database. You make the final decision.

Your job: choose the best 3 vacation destinations for this exact user. Do not simply repeat the local score order. Local scores are weak signals, not final answers.

Hard rules:
- Think independently from the user's answers.
- Use the candidate database as the available destination universe, but you may go outside it only if the database is clearly missing the best answer.
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

Destination database with local fit signals:
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
        reasoning: { effort: 'high' },
        tools: [{ type: 'web_search', search_context_size: 'medium' }],
        input: prompt,
      }),
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      res.status(200).json({ mode: 'local_only', message: 'OpenAI request failed. Use local ranking.', detail: data.error?.message || data });
      return;
    }

    const text = extractText(data);
    const parsed = parseJson(text);
    if (!parsed?.picks?.length) {
      res.status(200).json({ mode: 'local_only', message: 'AI did not return parseable picks. Use local ranking.', raw: text });
      return;
    }

    res.status(200).json({ mode: 'ai', ...parsed });
  } catch (err) {
    res.status(200).json({ mode: 'local_only', message: 'AI backend error. Use local ranking.', detail: err.message });
  }
}
