# Sermon Explorer

A full-stack application that transforms sermon transcripts into illustrated, age-adaptive storybook experiences for families.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express.js (Node.js) + TypeScript
- **Combined server**: Express serves both the API and the Vite dev middleware on port 5000
- **AI**: OpenAI (GPT-4o for content, DALL-E 3 for images, TTS for narration)

## Project Structure

```
client/          - React frontend (Vite root)
  src/
    pages/       - Home, Upload, Viewer pages
    components/  - UI components
    lib/         - Query client and utilities
server/          - Express backend
  index.ts       - Server entry point (port 5000, host 0.0.0.0)
  routes.ts      - API routes and AI processing pipeline
  vite.ts        - Vite dev server middleware integration
  static.ts      - Static file serving for production
shared/          - Shared types and demo data
  demo-data.ts   - Pre-loaded demo sermon (Luke 11)
script/
  build.ts       - Production build script
```

## Running

- Dev: `npm run dev` (runs `tsx server/index.ts` — starts Express + Vite middleware on port 5000)
- Build: `npm run build`
- Prod: `npm start` (runs `node dist/index.cjs`)

## Environment Variables

- `OPENAI_API_KEY` (secret) — Required for AI features (sermon processing, image generation, TTS)

## Key Features

- Upload sermons as .docx, .pdf, or .txt files
- AI pipeline: analyze → scene breakdown → age-adaptive narratives → DALL-E illustrations → quizzes → discussion prompts
- Three age groups: Young (4-6), Older (7-10), Family (11+)
- Demo sermon pre-loaded (Luke 11:37-54)
- In-memory sermon storage (no database)

## Notes

- `nanoid` is a transitive dependency (used in server/vite.ts for cache busting)
- OpenAI client is lazily instantiated to allow server startup without API key
- `__dirname` polyfill added to vite.config.ts for ESM compatibility
