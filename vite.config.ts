import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Load .env manually so the API key is available inside the Vite plugin
// (import.meta.env / process.env is not populated at config-load time in all
// Vite versions, so we read the file ourselves.)
// ---------------------------------------------------------------------------
function loadDotEnv(): Record<string, string> {
  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer' },
    categoryScores: {
      type: 'object',
      properties: {
        clarity: { type: 'integer' },
        impact: { type: 'integer' },
        atsCompatibility: { type: 'integer' },
        structure: { type: 'integer' },
      },
      required: ['clarity', 'impact', 'atsCompatibility', 'structure'],
    },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    rewrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          suggested: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['original', 'suggested', 'reason'],
      },
    },
    missingSections: { type: 'array', items: { type: 'string' } },
  },
  required: ['overallScore', 'categoryScores', 'summary', 'strengths', 'weaknesses', 'rewrites'],
};

const SYSTEM_INSTRUCTIONS = `You are a senior technical recruiter and resume coach. You review resumes critically but constructively, prioritising:
- IMPACT: Are achievements quantified (numbers, %, $, time saved)?
- CLARITY: Is each line concise, jargon-free, and action-oriented?
- ATS COMPATIBILITY: Are job-relevant keywords present? Is formatting machine-readable?
- STRUCTURE: Are sections logical, prioritised, well-spaced?

Score harshly. A 70 is "decent, would shortlist with reservations". A 90+ is rare. Be honest, not sycophantic.
For rewrites, pick the THREE WEAKEST bullets and rewrite each in a single, punchy line with a quantified result.`;

// ---------------------------------------------------------------------------
// Vite plugin: local dev API handler for /api/review
// ---------------------------------------------------------------------------
function localApiPlugin() {
  return {
    name: 'local-api-review',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/review', async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
        // Only handle POST
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        const env = loadDotEnv();
        const apiKey = env['GEMINI_API_KEY'] || process.env['GEMINI_API_KEY'];

        if (!apiKey || apiKey === 'Paste your key here' || apiKey.trim() === '') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'GEMINI_API_KEY not set. Create a .env file in the project root with: GEMINI_API_KEY=your_key_here\n\nGet a free key at https://aistudio.google.com/app/apikey',
          }));
          return;
        }

        // Read body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let resumeText: string;
        try {
          resumeText = JSON.parse(body)?.resumeText;
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
          return;
        }

        if (typeof resumeText !== 'string' || resumeText.trim().length < 100) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Field `resumeText` must be a string with at least 100 characters.' }));
          return;
        }

        const trimmed = resumeText.trim().slice(0, 30_000);
        const model = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
          const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `Review this resume and respond ONLY with JSON matching the provided schema.\n\n--- RESUME START ---\n${trimmed}\n--- RESUME END ---` }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0.2,
                maxOutputTokens: 8192,
              },
            }),
          });

          if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            console.error('[local-api] Gemini error:', geminiRes.status, errBody);
            if (geminiRes.status === 429) {
              res.writeHead(429, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: "Hit Gemini's rate limit. Wait a minute and try again." }));
              return;
            }
            if (geminiRes.status === 400 || geminiRes.status === 403) {
              res.writeHead(geminiRes.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Gemini rejected the request — check your GEMINI_API_KEY in .env.' }));
              return;
            }
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'AI provider failed. Try again in a moment.' }));
            return;
          }

          const data = await geminiRes.json();
          const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;

          if (!text) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `AI returned empty response${finishReason ? ` (${finishReason})` : ''}. Try again.` }));
            return;
          }

          const cleaned = text.trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `AI returned malformed JSON${finishReason === 'MAX_TOKENS' ? ' (truncated)' : ''}. Try again.` }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(parsed));
        } catch (err) {
          console.error('[local-api] Unexpected error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error.' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
});
