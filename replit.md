# Sermon Explorer

A full-stack application that transforms sermon transcripts into animated, age-adaptive storybook experiences for families.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express.js (Node.js) + TypeScript
- **Combined server**: Express serves both the API and the Vite dev middleware on port 5000
- **AI**: OpenAI (GPT-4o for content, DALL-E 3 for images, Sora 2 for animated MP4 videos, TTS for narration)

## Project Structure

```
client/          - React frontend (Vite root)
  src/
    pages/       - Home, Upload, Viewer pages
    components/  - UI components
      viewer/    - SceneViewer, SceneQuiz, DiscussionTime, StorySetup, FinalSummary
    lib/         - Query client and utilities
  public/        - Static assets (cdm-logo.webp)
server/          - Express backend
  index.ts       - Server entry point (port 5000, host 0.0.0.0)
  routes.ts      - API routes, AI processing pipeline, Sora 2 video generation
  vite.ts        - Vite dev server middleware integration
  static.ts      - Static file serving for production
shared/          - Shared types and demo data
  demo-data.ts   - Pre-loaded demo sermon (Luke 11)
generated/       - Runtime-generated content
  videos/        - Downloaded MP4 videos from Sora 2 (served via Express static)
script/
  build.ts       - Production build script
```

## Running

- Dev: `npm run dev` (runs `tsx server/index.ts` — starts Express + Vite middleware on port 5000)
- Build: `npm run build`
- Prod: `npm start` (runs `node dist/index.cjs`)

## Environment Variables

- `OPENAI_API_KEY` (secret) — Required for AI features (sermon processing, image generation, video generation, TTS)
- `SORA_MODEL` (optional) — Video model to use: `sora-2` (default) or `sora-2-pro`
- `SORA_VIDEO_SECONDS` (optional) — Video duration in seconds, default `10`

## Key Features

- Upload sermons as .docx, .pdf, or .txt files
- AI pipeline: analyze → scene breakdown → age-adaptive narratives → DALL-E illustrations → Sora 2 animated MP4 videos → quizzes → discussion prompts
- True animated video scenes via OpenAI Sora 2 API (real motion, not Ken Burns effects)
- Videos downloaded and cached locally in `generated/videos/` for persistence
- Auto-narration via TTS when each scene loads
- Configurable video quality: Standard (sora-2) or Pro (sora-2-pro) — selectable on upload page
- Three age groups: Young (4-6), Older (7-10), Family (11+)
- Fixed bottom action bar with Next Scene / Skip buttons
- Demo sermon pre-loaded (Luke 11:37-54)
- In-memory sermon storage (no database)

## API Endpoints

- `GET /api/sermons` - List all sermons
- `GET /api/sermons/:id` - Get sermon details with scenes
- `POST /api/upload` - Upload sermon file (.docx, .pdf, .txt) with optional `videoModel` field
- `POST /api/tts` - Generate TTS audio
- `POST /api/generate-image` - Generate DALL-E image
- `POST /api/generate-video` - Generate Sora 2 video (synchronous, waits for completion)
- `POST /api/generate-video-async` - Start async video generation
- `GET /api/video-status/:trackingKey` - Check video generation status
- `GET /api/sermons/:id/scenes/:sceneIndex/video-status` - Scene video status
- `GET /generated/videos/*` - Serve cached video files

## Video Generation Flow

1. Upload endpoint receives sermon + optional `videoModel` parameter
2. Pipeline generates DALL-E images first (fast, used as poster frames)
3. All Sora 2 video generation jobs are started in parallel
4. Quizzes and discussion prompts are generated while videos render
5. Pipeline AWAITS all videos to complete and download before marking sermon as "ready"
6. Completed MP4s are downloaded via `GET /v1/videos/{id}/content` and saved to `generated/videos/`
7. Upload page holds user with progress bar until everything is ready (72-95% = video download phase)
8. User only enters the viewer after all videos are downloaded — no "Generating animation..." overlays

## Notes

- `nanoid` is a transitive dependency (used in server/vite.ts for cache busting)
- OpenAI client is lazily instantiated to allow server startup without API key
- `__dirname` polyfill added to vite.config.ts and server/vite.ts for ESM compatibility
- Sora 2 API: `POST https://api.openai.com/v1/videos` with model `sora-2` or `sora-2-pro`
- Video status check: `GET https://api.openai.com/v1/videos/{id}` — returns status/progress (no download_url field)
- Video download: `GET https://api.openai.com/v1/videos/{id}/content` — returns MP4 binary stream when status is "completed"
- Video generation is fully synchronous in the pipeline — sermon not marked "ready" until all MP4s downloaded
- Quiz data format: handles both flat array and `{ questions: [...] }` object format
- Discussion prompts format: handles both flat array and `{ prompts: [...] }` object format
- Vite config has `@assets` alias pointing to `attached_assets/` directory
