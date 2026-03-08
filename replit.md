# Sermon Explorer

A full-stack application that transforms sermon transcripts into animated, age-adaptive storybook experiences for families.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion + CDM Brand
- **Backend**: Express.js (Node.js) + TypeScript
- **Combined server**: Express serves both the API and the Vite dev middleware on port 5000
- **AI**: Anthropic Claude Sonnet 4 for content generation, OpenAI TTS for narration, Google Gemini Imagen 3 for illustrations

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
  routes.ts      - API routes, AI processing pipeline, Gemini Imagen 3 image generation
  vite.ts        - Vite dev server middleware integration
  static.ts      - Static file serving for production
shared/          - Shared types
generated/       - Runtime-generated content
  images/        - Generated images from Gemini Imagen 3 (served via Express static)
script/
  build.ts       - Production build script
```

## Running

- Dev: `npm run dev` (runs `tsx server/index.ts` — starts Express + Vite middleware on port 5000)
- Build: `npm run build`
- Prod: `npm start` (runs `node dist/index.cjs`)

## Environment Variables

- `ANTHROPIC_API_KEY` (secret) — Required for text generation (Claude Sonnet 4 — sermon analysis, scene generation, narratives, quizzes, discussion prompts)
- `OPENAI_API_KEY` (secret) — Required for TTS narration only
- `GEMINI_API_KEY` (secret) — Required for image generation via Google Gemini Imagen 3

## Key Features

- Upload sermons as .docx, .pdf, or .txt files
- AI pipeline: analyze → scene breakdown → age-adaptive narratives → Gemini Imagen 3 illustrations → quizzes → discussion prompts
- Scene images displayed with Ken Burns CSS effects (zoom-in, zoom-out, pan-left, pan-right, fade) for cinematic animation feel
- Colorful cinematic 3D animated style — no realistic rendering. No copyrighted characters or brands.
- Never depicts God, Jesus, or the Holy Spirit — uses symbolic light/warmth instead
- No mouth movements or speaking gestures on characters
- Auto-narration via TTS (model tts-1-hd, voice nova, speed 0.9) starts immediately when each scene appears
- Three age groups: Young (4-6), Older (7-10), Family (11+)
- Fixed bottom action bar with Next Scene / Skip buttons
- In-memory sermon storage (no database)
- Sermon deletion with image cleanup

## API Endpoints

- `GET /api/sermons` - List all sermons
- `GET /api/sermons/:id` - Get sermon details with scenes
- `DELETE /api/sermons/:id` - Delete a sermon and its generated images
- `GET /api/sermons/:id/status` - Check sermon processing progress
- `GET /api/sermons/:id/scenes/:sceneIndex` - Get individual scene data
- `POST /api/upload` - Upload sermon file (.docx, .pdf, .txt)
- `POST /api/tts` - Generate TTS audio
- `POST /api/generate-image` - Generate image via Gemini Imagen 3
- `POST /api/generate-quiz` - Generate quiz questions
- `GET /generated/images/*` - Serve generated image files

## Image Generation (Gemini Imagen 3)

- API: `POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=GEMINI_API_KEY`
- Request: `{ instances: [{ prompt }], parameters: { aspectRatio: "16:9", numberOfImages: 1 } }`
- Response: `predictions[0].bytesBase64Encoded` — base64-encoded image data
- Images saved locally to `generated/images/` as PNG files
- URLs returned as `/generated/images/<sermonId>-scene<index>.png`

## Ken Burns CSS Effects

- Defined in `client/src/index.css`: `ken-zoom-in`, `ken-zoom-out`, `ken-pan-left`, `ken-pan-right`, `ken-fade`
- 8-second animation duration per scene
- Applied to scene images based on `scene.animationHint` from GPT-4o scene generation

## Brand / Design

- **CDM Brand Colors**: Blue #1d88a9, Green #80ad40, Purple #785992, Brown #7c6752, Gray-Blue #54636c
- **Theme**: White/light background with CDM brand accent colors; dark text (gray-800/700/600/500)
- **Tailwind color prefix**: `se-` (e.g., `se-blue`, `se-green`, `se-purple`, `se-brown`, `se-grayblue`, `se-navy`, `se-cream`)
- **Fonts**: Source Sans 3 (structural — sans, display, story), Yellowtail (accent/decorative — `font-accent`)
- **Google Fonts loaded in**: `client/index.html`
- **CDM logo**: `client/public/cdm-logo.webp` (transparent background, works on white)

## Notes

- `nanoid` is a transitive dependency (used in server/vite.ts for cache busting)
- OpenAI client reads API key fresh from env on every call (no caching)
- `__dirname` polyfill added to vite.config.ts and server/vite.ts for ESM compatibility
- Quiz data format: handles both flat array and `{ questions: [...] }` object format
- Discussion prompts format: handles both flat array and `{ prompts: [...] }` object format
- Vite config has `@assets` alias pointing to `attached_assets/` directory
