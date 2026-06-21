# Vacation Destination Generator

Hybrid vacation destination generator with:

- 15 one-by-one questions
- submit-anytime flow
- home ZIP starting point
- smart distance question generated from ZIP + trip length + travel method
- multi-select choice questions for more flexible answers
- custom typed mileage option on the distance question
- sleep-only lodging budget question
- 500-destination database
  - 300 United States destinations
  - 200 worldwide destinations
- local scoring engine
- async AI backend with OpenAI background mode and web search
- no destination suggestions are shown until AI returns final picks

## Best deployment

Use Vercel if you want the AI backend to work.

1. Create a GitHub repo.
2. Upload everything in this folder to the repo root.
3. Go to Vercel and import the repo.
4. Add this environment variable in Vercel:

```bash
OPENAI_API_KEY=your_key_here
```

Optional:

```bash
OPENAI_MODEL=gpt-5.5
```

5. Deploy.

## GitHub Pages note

GitHub Pages can host the UI, but it cannot run the `/api` backend routes because GitHub Pages does not run serverless backend functions.

For AI results, use Vercel, Netlify Functions, Cloudflare Workers, or another backend host.

## Files

- `index.html` — app shell
- `styles.css` — mobile-first dark UI
- `app.js` — questions, ZIP lookup, candidate scoring, async AI polling
- `api/start-recommend.js` — starts the OpenAI background job
- `api/check-recommend.js` — checks whether the AI job is finished
- `api/recommend.js` — legacy direct AI route kept for compatibility
- `data/destinations.json` — 500-place database
- `data/destinations.js` — browser version of the database
- `.nojekyll` — safe for GitHub Pages static hosting

## How the ranking works

The local engine creates compact context for the AI using:

- distance from home ZIP
- selected trip length
- selected travel methods
- smart travel range
- environment match
- sleep type match
- sleep-only budget match
- activities match
- group type
- trip pace
- climate preference
- crowds
- nightlife
- famous vs hidden-gem preference
- typed dealbreakers

The AI backend is the final decision-maker. The app starts an OpenAI background job, polls until the AI finishes, and only then displays the top 3 suggestions.
