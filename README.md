# ResumeIQ — AI Resume Reviewer

Upload a resume PDF → AI returns a scored, structured review with strengths, weaknesses, and three rewritten bullets.

Built with **React + TypeScript + Vite + Tailwind + Framer Motion** on the frontend, a **Vercel serverless function** on the backend that calls **Google Gemini 2.5 Flash** (free tier, no credit card).

## How it works

```
Browser:                          Vercel server:
1. User drops a PDF               4. /api/review receives { resumeText }
2. pdfjs extracts text in-browser 5. Calls Gemini with a structured schema
3. POST /api/review (with text)   6. Returns clean JSON → renders results
```

The resume text is processed in memory and never persisted.

---

## One-time setup

### 1. Get a free Gemini API key

1. Go to <https://aistudio.google.com/apikey>
2. Sign in with a Google account → click **Create API key**
3. Copy the key (looks like `AIza…`)

> Free tier as of 2026: 250 requests/day, no credit card needed.

### 2. Save the key locally

```bash
cp .env.example .env
# open .env in any editor, paste your key after GEMINI_API_KEY=
```

### 3. Install deps

```bash
npm install
```

### 4. Install the Vercel CLI (once, globally)

Local `npm run dev` won't run the `/api/review` serverless function — you need Vercel's local emulator:

```bash
npm install -g vercel
```

---

## Run locally

```bash
vercel dev
```

First time: it asks you a couple of questions (link to a Vercel project — say no/skip for purely local). Then opens at <http://localhost:3000>.

> **Tip:** `vercel dev` reads your `.env` file automatically. No extra flags needed.

If you just want to preview the UI without the AI call (no key needed), `npm run dev` works fine — but clicking "Review" will fail since `/api/review` isn't running.

---

## Deploy to Vercel

### Via the dashboard (easiest)

1. Push this folder to a GitHub repo (`git init && git add . && git commit -m "init" && git push`)
2. Go to <https://vercel.com/new>, import the repo
3. **Before** clicking Deploy → expand **Environment Variables** → add:
   - Name: `GEMINI_API_KEY`
   - Value: your key
4. Click **Deploy**

That's it. Live URL in ~30 seconds.

### Via the CLI

```bash
vercel              # preview deploy
vercel env add GEMINI_API_KEY   # paste your key when asked
vercel --prod       # production deploy
```

---

## Project layout

```
resumeiq/
├── api/
│   └── review.ts              # serverless function — calls Gemini
├── src/
│   ├── App.tsx                # state machine: idle → loading → result
│   ├── main.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── pdfExtract.ts      # browser-side PDF → text
│   │   └── types.ts           # ReviewResult shape
│   └── components/
│       ├── UploadZone.tsx     # drag-drop + paste tabs
│       ├── LoadingState.tsx   # animated loader
│       └── ResultView.tsx     # score + categories + strengths/weaknesses + rewrites
├── .env.example
├── vercel.json
└── package.json
```

## Common tweaks

| Want to change | File / line |
|---|---|
| The AI's review style / strictness | `api/review.ts` — `SYSTEM_INSTRUCTIONS` |
| Output structure (add fields, etc.) | `api/review.ts` — `RESPONSE_SCHEMA` + `src/lib/types.ts` |
| The hero copy | `src/App.tsx` |
| Colors / fonts | `src/index.css` |
| Model (e.g. switch to `gemini-2.5-flash-lite`) | `api/review.ts` — the `model` variable |
| Char limits | `api/review.ts` and `src/components/UploadZone.tsx` |

## Costs

Free tier covers ~250 reviews/day. If you blow past that, set up billing — Gemini 2.5 Flash is ~$0.30 per 1M input tokens, so a real review costs roughly $0.001. A thousand reviews ≈ $1.
