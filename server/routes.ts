import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { DEMO_SERMON_DATA } from "@shared/demo-data";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as any)[prop];
  }
});
const upload = multer({ dest: "uploads/" });

// In-memory store for processed sermons
const processedSermons: Map<string, any> = new Map();

// Load demo data on startup
processedSermons.set("demo-luke-11", DEMO_SERMON_DATA);

export async function registerRoutes(server: Server, app: Express) {
  // Serve generated images
  app.use("/generated", express.static(path.resolve("generated")));

  // ============================================
  // SERMON MANAGEMENT
  // ============================================

  // List available sermons
  app.get("/api/sermons", (_req, res) => {
    const sermons = Array.from(processedSermons.entries()).map(([id, data]) => ({
      id,
      title: data.title,
      scripture: data.scripture,
      status: data.status,
      sceneCount: data.scenes?.length || 0,
      createdAt: data.createdAt,
    }));
    res.json(sermons);
  });

  // Get full sermon data
  app.get("/api/sermons/:id", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });
    res.json(sermon);
  });

  app.delete("/api/sermons/:id", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    const sermonId = req.params.id;
    processedSermons.delete(sermonId);

    const videosDir = path.resolve("generated", "videos");
    if (fs.existsSync(videosDir)) {
      const files = fs.readdirSync(videosDir);
      for (const file of files) {
        if (file.startsWith(sermonId)) {
          fs.unlinkSync(path.join(videosDir, file));
        }
      }
    }

    for (const [key] of videoGenerationJobs) {
      if (key.startsWith(sermonId)) {
        videoGenerationJobs.delete(key);
      }
    }

    console.log(`Sermon deleted: ${sermonId}`);
    res.json({ message: "Sermon deleted" });
  });

  // Get a specific scene
  app.get("/api/sermons/:id/scenes/:sceneIndex", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });
    const scene = sermon.scenes?.[parseInt(req.params.sceneIndex)];
    if (!scene) return res.status(404).json({ message: "Scene not found" });
    res.json(scene);
  });

  // ============================================
  // UPLOAD & PROCESSING PIPELINE
  // ============================================

  app.post("/api/upload", upload.single("sermon"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const sermonId = `sermon-${Date.now()}`;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
      // Step 1: Extract text
      let text = "";
      if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (fileName.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default;
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (fileName.endsWith(".txt")) {
        text = fs.readFileSync(filePath, "utf-8");
      } else {
        return res.status(400).json({ message: "Unsupported file type. Use .docx, .pdf, or .txt" });
      }

      // Initialize sermon entry
      processedSermons.set(sermonId, {
        id: sermonId,
        title: "Processing...",
        scripture: "",
        status: "processing",
        rawText: text,
        scenes: [],
        createdAt: new Date().toISOString(),
      });

      const videoModel = req.body?.videoModel || undefined;

      res.json({ sermonId, status: "processing", message: "Sermon uploaded. Processing started." });

      // Run pipeline in background
      processSermon(sermonId, text, videoModel).catch((err) => {
        console.error("Pipeline error:", err);
        const sermon = processedSermons.get(sermonId);
        if (sermon) {
          sermon.status = "error";
          sermon.error = err.message;
        }
      });
    } catch (err: any) {
      res.status(500).json({ message: "Upload failed", error: err.message });
    } finally {
      // Clean up uploaded file
      fs.unlink(filePath, () => {});
    }
  });

  // Check processing status
  app.get("/api/sermons/:id/status", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });
    const readyVideos = sermon.scenes?.filter((s: any) => s.videoStatus === "ready").length || 0;
    const totalScenes = sermon.scenes?.length || 0;
    res.json({
      status: sermon.status,
      progress: sermon.progress || 0,
      currentStep: sermon.currentStep || "",
      sceneCount: totalScenes,
      videosReady: readyVideos,
    });
  });

  // ============================================
  // AI GENERATION ENDPOINTS (for on-demand use)
  // ============================================

  // Generate TTS for a scene narration
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: voice || "nova",
        input: text,
        speed: 0.9,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set({ "Content-Type": "audio/mpeg", "Content-Length": buffer.length.toString() });
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ message: "TTS failed", error: err.message });
    }
  });

  // Generate image for a scene (on-demand)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, sceneIndex, sermonId } = req.body;
      const imageUrl = await generateImage(prompt);

      // If sermonId provided, update the scene
      if (sermonId && sceneIndex !== undefined) {
        const sermon = processedSermons.get(sermonId);
        if (sermon?.scenes?.[sceneIndex]) {
          sermon.scenes[sceneIndex].imageUrl = imageUrl;
        }
      }

      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ message: "Image generation failed", error: err.message });
    }
  });

  // Generate additional quiz questions for a scene
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { sceneContent, ageGroup } = req.body;
      const questions = await generateQuiz(sceneContent, ageGroup);
      res.json({ questions });
    } catch (err: any) {
      res.status(500).json({ message: "Quiz generation failed", error: err.message });
    }
  });

  // Generate video for a scene (on-demand via Sora 2 API)
  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, sceneIndex, sermonId, model } = req.body;
      if (!prompt) return res.status(400).json({ message: "prompt is required" });

      const videoResult = await generateVideo(prompt, model);

      if (sermonId && sceneIndex !== undefined) {
        const sermon = processedSermons.get(sermonId);
        if (sermon?.scenes?.[sceneIndex]) {
          sermon.scenes[sceneIndex].videoUrl = videoResult.url;
          sermon.scenes[sceneIndex].videoStatus = "ready";
        }
      }

      res.json({ videoUrl: videoResult.url, status: "ready" });
    } catch (err: any) {
      console.error("Video generation failed:", err);
      res.status(500).json({ message: "Video generation failed", error: err.message });
    }
  });

  // Start async video generation for a scene
  app.post("/api/generate-video-async", async (req, res) => {
    try {
      const { prompt, sceneIndex, sermonId, model } = req.body;
      if (!prompt) return res.status(400).json({ message: "prompt is required" });

      const videoId = await startVideoGeneration(prompt, model);
      const trackingKey = `${sermonId}-${sceneIndex}`;
      videoGenerationJobs.set(trackingKey, { videoId, status: "generating", url: null });

      if (sermonId && sceneIndex !== undefined) {
        const sermon = processedSermons.get(sermonId);
        if (sermon?.scenes?.[sceneIndex]) {
          sermon.scenes[sceneIndex].videoStatus = "generating";
        }
      }

      pollVideoCompletion(trackingKey, videoId, sermonId, sceneIndex);

      res.json({ videoId, trackingKey, status: "generating" });
    } catch (err: any) {
      console.error("Video generation start failed:", err);
      res.status(500).json({ message: "Video generation failed", error: err.message });
    }
  });

  // Check video generation status
  app.get("/api/video-status/:trackingKey", (req, res) => {
    const job = videoGenerationJobs.get(req.params.trackingKey);
    if (!job) return res.status(404).json({ message: "No video job found" });
    res.json({ status: job.status, videoUrl: job.url });
  });

  // Check video status by sermon/scene
  app.get("/api/sermons/:id/scenes/:sceneIndex/video-status", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });
    const scene = sermon.scenes?.[parseInt(req.params.sceneIndex)];
    if (!scene) return res.status(404).json({ message: "Scene not found" });
    res.json({
      videoStatus: scene.videoStatus || "none",
      videoUrl: scene.videoUrl || null,
      imageUrl: scene.imageUrl || null,
    });
  });
}

// ============================================
// VIDEO GENERATION (OpenAI Videos API - Sora 2)
// ============================================

const SORA_MODEL = process.env.SORA_MODEL || "sora-2";
const SORA_VIDEO_SECONDS = process.env.SORA_VIDEO_SECONDS || "12";
const VIDEOS_DIR = path.resolve("generated", "videos");
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const videoGenerationJobs: Map<string, { videoId: string; status: string; url: string | null }> = new Map();

async function startVideoGeneration(prompt: string, model?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for video generation");

  const useModel = model || SORA_MODEL;
  console.log(`Starting video generation with model=${useModel}, seconds=${SORA_VIDEO_SECONDS}`);

  const response = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: useModel,
      prompt: prompt,
      size: "1280x720",
      seconds: SORA_VIDEO_SECONDS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sora API error:", response.status, errorText);
    throw new Error(`Sora API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  console.log(`Video job created: ${data.id}, status: ${data.status}`);
  return data.id;
}

async function checkVideoStatus(videoId: string): Promise<{ status: string; videoId: string; progress?: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required");

  const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sora status check error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;

  if (data.status === "completed") {
    return { status: "ready", videoId, progress: 100 };
  } else if (data.status === "failed") {
    return { status: "failed", videoId };
  }

  return { status: "generating", videoId, progress: data.progress || 0 };
}

async function downloadVideoContent(videoId: string, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required");

  const response = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video download failed: ${response.status} - ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(VIDEOS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Video downloaded and saved: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
  return `/generated/videos/${filename}`;
}

async function generateVideo(prompt: string, model?: string): Promise<{ url: string }> {
  const videoId = await startVideoGeneration(prompt, model);

  let attempts = 0;
  const maxAttempts = 60;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 15000));
    attempts++;

    const result = await checkVideoStatus(videoId);
    if (result.status === "ready") {
      const localPath = await downloadVideoContent(videoId, `${videoId}.mp4`);
      return { url: localPath };
    }
    if (result.status === "failed") {
      throw new Error("Video generation failed on Sora side");
    }
  }

  throw new Error("Video generation timed out after 15 minutes");
}

function pollVideoCompletion(trackingKey: string, videoId: string, sermonId: string, sceneIndex: number) {
  const poll = async () => {
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      attempts++;

      try {
        const result = await checkVideoStatus(videoId);
        const job = videoGenerationJobs.get(trackingKey);

        if (result.status === "ready") {
          const localPath = await downloadVideoContent(videoId, `${sermonId}-scene${sceneIndex}.mp4`);

          if (job) {
            job.status = "ready";
            job.url = localPath;
          }
          const sermon = processedSermons.get(sermonId);
          if (sermon?.scenes?.[sceneIndex]) {
            sermon.scenes[sceneIndex].videoUrl = localPath;
            sermon.scenes[sceneIndex].videoStatus = "ready";
          }
          console.log(`Video ready for ${trackingKey}: ${localPath}`);
          return;
        }

        if (result.status === "failed") {
          if (job) job.status = "failed";
          const sermon = processedSermons.get(sermonId);
          if (sermon?.scenes?.[sceneIndex]) {
            sermon.scenes[sceneIndex].videoStatus = "failed";
          }
          console.error(`Video generation failed for ${trackingKey}`);
          return;
        }

        if (result.progress !== undefined) {
          console.log(`Video ${trackingKey}: ${result.progress}% complete`);
        }
      } catch (err) {
        console.error(`Error polling video ${trackingKey}:`, err);
      }
    }

    const job = videoGenerationJobs.get(trackingKey);
    if (job) job.status = "failed";
    console.error(`Video generation timed out for ${trackingKey}`);
  };

  poll().catch(console.error);
}

// ============================================
// PROCESSING PIPELINE
// ============================================

async function processSermon(sermonId: string, text: string, videoModel?: string) {
  const sermon = processedSermons.get(sermonId)!;

  const updateProgress = (step: string, progress: number) => {
    sermon.currentStep = step;
    sermon.progress = progress;
  };

  // Step 1: Analyze sermon structure
  updateProgress("Analyzing sermon structure...", 10);
  const analysis = await analyzeSermon(text);
  sermon.title = analysis.title;
  sermon.scripture = analysis.scripture;
  sermon.summary = analysis.summary;
  sermon.keyThemes = analysis.keyThemes;

  // Step 2: Generate scene breakdowns
  updateProgress("Breaking sermon into scenes...", 20);
  const scenes = await generateScenes(text, analysis);
  sermon.scenes = scenes;

  // Step 3: Generate age-adaptive narratives for each scene
  updateProgress("Writing age-appropriate narratives...", 35);
  for (let i = 0; i < scenes.length; i++) {
    updateProgress(`Writing narratives for scene ${i + 1}/${scenes.length}...`, 35 + (i / scenes.length) * 15);
    const narratives = await generateNarratives(scenes[i]);
    scenes[i].narratives = narratives;
  }

  // Step 4: Generate images first (fast), then start video generation in background
  updateProgress("Generating illustrations...", 50);
  fs.mkdirSync("generated", { recursive: true });
  for (let i = 0; i < scenes.length; i++) {
    updateProgress(`Illustrating scene ${i + 1}/${scenes.length}...`, 50 + (i / scenes.length) * 15);
    try {
      const imageUrl = await generateImage(scenes[i].imagePrompt);
      scenes[i].imageUrl = imageUrl;
    } catch (err) {
      console.error(`Image gen failed for scene ${i}:`, err);
      scenes[i].imageUrl = null;
    }
  }

  // Step 4b: Start ALL video generation jobs in parallel
  updateProgress("Starting video animations...", 65);
  const videoJobs: Array<{ index: number; videoId: string }> = [];
  for (let i = 0; i < scenes.length; i++) {
    const videoPrompt = scenes[i].videoPrompt || scenes[i].imagePrompt;
    try {
      scenes[i].videoStatus = "generating";
      const videoId = await startVideoGeneration(videoPrompt, videoModel);
      videoJobs.push({ index: i, videoId });
      const trackingKey = `${sermonId}-${i}`;
      videoGenerationJobs.set(trackingKey, { videoId, status: "generating", url: null });
    } catch (err) {
      console.error(`Video gen start failed for scene ${i}:`, err);
      scenes[i].videoStatus = "failed";
    }
  }

  // Step 5: Generate quizzes and discussion prompts (while videos generate in parallel)
  updateProgress("Creating quizzes and discussion prompts...", 68);
  for (let i = 0; i < scenes.length; i++) {
    const quiz = await generateQuiz(scenes[i].content, "mixed");
    scenes[i].quiz = quiz;
    const discussion = await generateDiscussionPrompts(scenes[i]);
    scenes[i].discussionPrompts = discussion;
  }

  // Step 6: Wait for ALL videos to finish generating and download them
  updateProgress("Generating animated videos... This takes a few minutes.", 72);
  if (videoJobs.length > 0) {
    const totalVideos = videoJobs.length;
    let completedVideos = 0;

    await Promise.all(videoJobs.map(async ({ index, videoId }) => {
      try {
        let attempts = 0;
        const maxAttempts = 90;
        let lastProgress = -1;
        let stallCount = 0;
        const maxStallCount = 12;
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          attempts++;

          const result = await checkVideoStatus(videoId);
          const progressPct = result.progress || 0;
          console.log(`Video ${sermonId}-${index}: ${progressPct}% complete`);

          if (progressPct === lastProgress) {
            stallCount++;
            if (stallCount >= maxStallCount) {
              scenes[index].videoStatus = "failed";
              completedVideos++;
              console.error(`Video stalled at ${progressPct}% for ${sermonId}-${index} (no progress for ${maxStallCount * 10}s)`);
              return;
            }
          } else {
            stallCount = 0;
            lastProgress = progressPct;
          }

          if (result.status === "ready") {
            const localPath = await downloadVideoContent(videoId, `${sermonId}-scene${index}.mp4`);
            scenes[index].videoUrl = localPath;
            scenes[index].videoStatus = "ready";
            const trackingKey = `${sermonId}-${index}`;
            const job = videoGenerationJobs.get(trackingKey);
            if (job) { job.status = "ready"; job.url = localPath; }
            completedVideos++;
            const videoProg = 72 + Math.round((completedVideos / totalVideos) * 23);
            updateProgress(`Videos ready: ${completedVideos} of ${totalVideos}`, videoProg);
            console.log(`Video ready for ${sermonId}-${index}: ${localPath}`);
            return;
          }

          if (result.status === "failed") {
            scenes[index].videoStatus = "failed";
            completedVideos++;
            console.error(`Video generation failed for ${sermonId}-${index}`);
            return;
          }
        }
        scenes[index].videoStatus = "failed";
        completedVideos++;
        console.error(`Video generation timed out for ${sermonId}-${index}`);
      } catch (err) {
        console.error(`Video error for ${sermonId}-${index}:`, err);
        scenes[index].videoStatus = "failed";
        completedVideos++;
      }
    }));
  }

  // Step 7: Final assembly — all videos are downloaded
  updateProgress("Assembling experience...", 98);
  sermon.status = "ready";
  sermon.progress = 100;
  sermon.currentStep = "Complete";
}

async function analyzeSermon(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a sermon analysis expert. Analyze the given sermon transcript and extract structured information. Respond with JSON:
{
  "title": "A clear, engaging title for this sermon",
  "scripture": "The primary Scripture passage (e.g., 'Luke 11:37-54')",
  "summary": "A 2-3 sentence summary of the sermon's main message",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "targetAudience": "Who this sermon is primarily addressing",
  "emotionalArc": "The emotional journey of the sermon (e.g., 'conviction to grace')"
}`,
      },
      { role: "user", content: text.substring(0, 8000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return JSON.parse(response.choices[0].message.content || "{}");
}

async function generateScenes(text: string, analysis: any) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a creative director turning a sermon into an illustrated storybook. Break the sermon into 8-10 visual scenes. Each scene should be a self-contained moment that can be illustrated and narrated.

CRITICAL STYLE AND CONTENT RULES:
- All visuals must be in a Pixar/Disney 3D animation style: colorful, stylized, expressive characters with big eyes, smooth 3D rendering, warm cinematic lighting. NOT realistic, NOT watercolor — think Pixar movie quality.
- NEVER depict God, Jesus, or the Holy Spirit as a character or figure. Instead, represent their presence through symbolic imagery: warm golden light, a gentle breeze, glowing clouds, a radiant sunrise, a guiding star, a comforting glow, or other abstract/symbolic visuals.
- Characters must NEVER have mouth movements, speaking gestures, or dialog. No characters should appear to be talking. Show characters listening, thinking, walking, looking, gesturing — but never speaking.
- No background music, sound effects, or dialog should be described in video prompts. The videos are silent visual animations only.

For each scene, provide:
- title: A short, engaging scene title
- content: The core teaching content of this scene (2-3 paragraphs from the sermon)
- scriptureRef: Any Bible verse referenced in this section
- keyPoint: The single most important idea in this scene
- emotion: The emotional tone (joy, wonder, conviction, comfort, etc.)
- imagePrompt: A detailed DALL-E prompt for a Pixar/Disney 3D animated style illustration. Colorful, stylized characters with expressive faces, smooth 3D rendering, warm cinematic lighting, biblical setting. Suitable for children ages 4-12. Never include text in images. Never depict God or Jesus as a character — use symbolic light, glowing clouds, or radiant warmth instead. No characters should have open mouths or appear to be speaking.
- videoPrompt: A detailed prompt for a 12-second Pixar-style 3D animated video of this scene. Describe gentle motion and action: characters walking, looking around, reacting emotionally, wind blowing through hair/clothes, light shifting, camera panning slowly. Pixar/Disney 3D animation style with warm cinematic lighting and rich colors. NO mouth movements or speaking gestures. NO background music or dialog. Never show God or Jesus — use symbolic golden light, glowing atmosphere, or radiant warmth. Keep motion gentle and calming, suitable for children. Never include text or words.
- animationHint: "zoom-in", "pan-left", "pan-right", "zoom-out", or "fade"

Respond with JSON: { "scenes": [...] }`,
      },
      {
        role: "user",
        content: `Sermon title: ${analysis.title}
Scripture: ${analysis.scripture}
Themes: ${analysis.keyThemes?.join(", ")}

Full sermon text:
${text.substring(0, 12000)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 16384,
  });

  const raw = response.choices[0].message.content || '{"scenes":[]}';

  if (response.choices[0].finish_reason === "length") {
    console.warn("Scene generation response was truncated, retrying with fewer scenes...");
    const retryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a creative director turning a sermon into an illustrated storybook. Break the sermon into 5-6 visual scenes. Each scene should be a self-contained moment that can be illustrated and narrated.

CRITICAL RULES: Pixar/Disney 3D animation style only (NOT realistic). NEVER depict God, Jesus, or the Holy Spirit — use symbolic light/warmth instead. No mouth movements or speaking gestures. No background music or dialog in video prompts.

For each scene, provide:
- title: A short, engaging scene title
- content: The core teaching content of this scene (1-2 paragraphs from the sermon)
- scriptureRef: Any Bible verse referenced in this section
- keyPoint: The single most important idea in this scene
- emotion: The emotional tone (joy, wonder, conviction, comfort, etc.)
- imagePrompt: A DALL-E prompt for Pixar/Disney 3D animated style. Colorful, stylized characters, smooth 3D rendering, warm cinematic lighting, biblical setting. No text. Never depict God or Jesus — use symbolic light. No open mouths.
- videoPrompt: A prompt for a 12-second Pixar-style 3D animated video. Gentle motion: characters walking, reacting, light shifting, camera panning. NO mouth movements, NO dialog, NO music. Never show God or Jesus — use golden light. No text.
- animationHint: "zoom-in", "pan-left", "pan-right", "zoom-out", or "fade"

Respond with JSON: { "scenes": [...] }`,
        },
        {
          role: "user",
          content: `Sermon title: ${analysis.title}
Scripture: ${analysis.scripture}
Themes: ${analysis.keyThemes?.join(", ")}

Full sermon text:
${text.substring(0, 8000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 16384,
    });
    const retryRaw = retryResponse.choices[0].message.content || '{"scenes":[]}';
    const retryParsed = JSON.parse(retryRaw);
    return retryParsed.scenes || [];
  }

  const parsed = JSON.parse(raw);
  return parsed.scenes || [];
}

async function generateNarratives(scene: any) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You create age-appropriate retellings of sermon scenes. For each scene, write THREE versions:

1. "young" (ages 4-6): Very simple sentences. Use concrete images. 3-4 sentences max. No abstract theology.
2. "older" (ages 7-10): Simple but more detailed. Can handle basic metaphors. 4-6 sentences.
3. "family" (ages 11+/adults): Full depth of the teaching. Can reference theology. 5-8 sentences. This should help parents who may not be Bible-literate understand the sermon point clearly.

Each version should tell the same story but at the right level. Be warm, never scary.

Respond with JSON: { "young": "...", "older": "...", "family": "..." }`,
      },
      {
        role: "user",
        content: `Scene: ${scene.title}
Key Point: ${scene.keyPoint}
Content: ${scene.content}
Scripture: ${scene.scriptureRef || "none"}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  return JSON.parse(response.choices[0].message.content || "{}");
}

async function generateImage(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1792x1024",
    quality: "standard",
  });
  return response.data?.[0]?.url || "";
}

async function generateQuiz(content: string, ageGroup: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Create quiz questions about a sermon scene for families. Generate questions at multiple levels.

Respond with JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C"],
      "correctIndex": 0,
      "explanation": "A brief, encouraging explanation",
      "ageGroup": "young" | "older" | "family"
    }
  ]
}

Create 2 questions for each age group (6 total).

IMPORTANT RULES:
- "young" questions (ages 4-6): Use simple Yes/No format with options ["Yes", "No"]. Frame the question so "Yes" or "No" is the answer. NEVER use "True/False". Keep language very simple.
- "older" questions (ages 7-10): Multiple choice with 3 text options. Questions should be straightforward and age-appropriate.
- "family" questions (ages 11+): Multiple choice with 3 text options. Can be deeper and more reflective.
- ALL questions must be answerable from the narration text alone. NEVER ask the user to identify, compare, or choose between images, pictures, illustrations, or visual elements. The quiz is text-only — the user cannot see any images while answering.
- NEVER reference "which picture" or "which image" or ask users to compare visual options.`,
      },
      { role: "user", content: content },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  return JSON.parse(response.choices[0].message.content || '{"questions":[]}');
}

async function generateDiscussionPrompts(scene: any) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Create family discussion prompts for a sermon scene. These should help parents and children talk about the sermon together at home.

Respond with JSON:
{
  "prompts": [
    {
      "question": "An open-ended question for family discussion",
      "parentTip": "A brief tip to help parents guide the conversation",
      "connectionToLife": "How this connects to everyday family life"
    }
  ]
}

Create 2-3 prompts per scene. Make them practical, warm, and accessible to parents who may not be deeply Bible-literate.`,
      },
      {
        role: "user",
        content: `Scene: ${scene.title}\nKey Point: ${scene.keyPoint}\nContent: ${scene.content}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });
  return JSON.parse(response.choices[0].message.content || '{"prompts":[]}');
}

// Need to import express for the static middleware
import express from "express";
