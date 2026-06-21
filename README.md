# Vacation Destination Generator

Hybrid vacation destination generator with:

- 15 one-by-one questions
- submit-anytime flow
- home ZIP starting point
- smart distance question generated from ZIP + trip length + travel method
- multi-select travel, environment, lodging, activity, food, nightlife, group questions
- sleep-only lodging budget question
- 500-destination fallback database
  - 300 United States destinations
  - 200 worldwide destinations
- local scoring engine
- optional AI backend route for live refinement and web search

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

GitHub Pages can host the UI and the 500-destination local ranking, but it cannot run `/api/recommend.js` because GitHub Pages does not run serverless backend functions.

For AI results, use Vercel, Netlify Functions, Cloudflare Workers, or another backend host.

## Files

- `index.html` — app shell
- `styles.css` — mobile-first dark UI
- `app.js` — questions, scoring, ZIP lookup, local ranking, AI call
- `api/recommend.js` — serverless AI route
- `data/destinations.json` — 500-place database
- `data/destinations.js` — browser version of the database
- `.nojekyll` — safe for GitHub Pages static hosting

## How the ranking works

The local engine scores each destination by:

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

Then the AI backend, when connected, receives the top local candidates and can refine the top 3 with live search.
