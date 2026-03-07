# Sermon Explorer

A full-stack application that transforms sermon transcripts into animated, age-adaptive storybook experiences for families.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express.js (Node.js) + TypeScript
- **Combined server**: Express serves both the API and the Vite dev middleware on port 5000
- **AI**: OpenAI (GPT-4o for content, DALL-E 3 for images, Sora for video animations, TTS for narration)

## Project Structure

```
client/          - React frontend (Vite root)
  src/
    pages/       - Home, Upload, Viewer pages
    components/  - UI components
      viewer/    - SceneViewer, SceneQuiz, DiscussionTime, StorySetup, FinalSummary
    lib/         - Query client and utilities
server/          - Express backend
  index.ts       - Server entry point (port 5000, host 0.0.0.0)
  routes.ts      - API routes, AI processing pipeline, Sora video generation
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

- `OPENAI_API_KEY` (secret) — Required for AI features (sermon processing, image generation, video generation, TTS)

## Key Features

- Upload sermons as .docx, .pdf, or .txt files
- AI pipeline: analyze → scene breakdown → age-adaptive narratives → DALL-E illustrations → Sora video animations → quizzes → discussion prompts
- Auto-playing animated video scenes (10-15 seconds via OpenAI Sora API)
- Auto-narration via TTS when each scene loads
- Three age groups: Young (4-6), Older (7-10), Family (11+)
- Fixed bottom action bar with Next Scene / Skip buttons
- Demo sermon pre-loaded (Luke 11:37-54)
- In-memory sermon storage (no database)

## API Endpoints

- `GET /api/sermons` - List all sermons
- `GET /api/sermons/:id` - Get sermon details with scenes
- `POST /api/upload` - Upload sermon file (.docx, .pdf, .txt)
- `POST /api/tts` - Generate TTS audio
- `POST /api/generate-image` - Generate DALL-E image
- `POST /api/generate-video` - Generate Sora video (synchronous, waits for completion)
- `POST /api/generate-video-async` - Start async video generation
- `GET /api/video-status/:trackingKey` - Check video generation status
- `GET /api/sermons/:id/scenes/:sceneIndex/video-status` - Scene video status

## Notes

- `nanoid` is a transitive dependency (used in server/vite.ts for cache busting)
- OpenAI client is lazily instantiated to allow server startup without API key
- `__dirname` polyfill added to vite.config.ts and server/vite.ts for ESM compatibility
- Sora API is called via direct REST (not via SDK) since the SDK version doesn't include video support
- Video generation runs in background with polling; frontend polls for completion
- Quiz data format: handles both flat array and `{ questions: [...] }` object format
- Discussion prompts format: handles both flat array and `{ prompts: [...] }` object format
