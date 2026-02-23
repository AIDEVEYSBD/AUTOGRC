// ─────────────────────────────────────────────────────────────────────────────
// AI CONFIGURATION
//
// Local development → create .env.local in the project root:
//   OPENAI_API_KEY=sk-...
//
// Vercel deployment → Project Settings › Environment Variables
//   Add: OPENAI_API_KEY = sk-...
// ─────────────────────────────────────────────────────────────────────────────

export const AI_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  MODEL: "gpt-5",
} as const;
