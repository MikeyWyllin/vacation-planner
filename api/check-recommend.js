export const config = { runtime: 'nodejs' };
export const maxDuration = 60;

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

function explainDetail(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.reason) return value.reason;
  try { return JSON.stringify(value); } catch { return String(value); }
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
    const responseId = body?.responseId;
    if (!responseId) {
      res.status(400).json({ mode: 'no_ai_picks', message: 'Missing responseId.' });
      return;
    }

    const aiRes = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      res.status(200).json({ mode: 'no_ai_picks', message: 'Could not check the AI job.', detail: data.error?.message || data });
      return;
    }

    const status = data.status || 'unknown';
    if (status === 'queued' || status === 'in_progress') {
      res.status(200).json({ mode: 'ai_pending', responseId, status });
      return;
    }

    if (status !== 'completed') {
      const detail = explainDetail(data.error?.message || data.incomplete_details || data);
      res.status(200).json({ mode: 'no_ai_picks', message: `AI job ended without completed results: ${status}`, detail });
      return;
    }

    const text = extractText(data);
    const parsed = parseJson(text);
    if (!parsed?.picks?.length) {
      res.status(200).json({ mode: 'no_ai_picks', message: 'AI finished but did not return parseable picks. No suggestions are shown.', raw: text });
      return;
    }

    res.status(200).json({ mode: 'ai', ...parsed });
  } catch (err) {
    res.status(200).json({ mode: 'no_ai_picks', message: 'AI status check failed.', detail: err.message });
  }
}
