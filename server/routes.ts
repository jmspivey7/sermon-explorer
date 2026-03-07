import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { DEMO_SERMON_DATA } from "@shared/demo-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

      res.json({ sermonId, status: "processing", message: "Sermon uploaded. Processing started." });

      // Run pipeline in background
      processSermon(sermonId, text).catch((err) => {
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
    res.json({
      status: sermon.status,
      progress: sermon.progress || 0,
      currentStep: sermon.currentStep || "",
      sceneCount: sermon.scenes?.length || 0,
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
        model: "tts-1",
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
}

// ============================================
// PROCESSING PIPELINE
// ============================================

async function processSermon(sermonId: string, text: string) {
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

  // Step 4: Generate images for each scene
  updateProgress("Generating illustrations...", 50);
  fs.mkdirSync("generated", { recursive: true });
  for (let i = 0; i < scenes.length; i++) {
    updateProgress(`Illustrating scene ${i + 1}/${scenes.length}...`, 50 + (i / scenes.length) * 25);
    try {
      const imageUrl = await generateImage(scenes[i].imagePrompt);
      scenes[i].imageUrl = imageUrl;
    } catch (err) {
      console.error(`Image gen failed for scene ${i}:`, err);
      scenes[i].imageUrl = null;
    }
  }

  // Step 5: Generate quizzes and discussion prompts
  updateProgress("Creating quizzes and discussion prompts...", 80);
  for (let i = 0; i < scenes.length; i++) {
    const quiz = await generateQuiz(scenes[i].content, "mixed");
    scenes[i].quiz = quiz;
    const discussion = await generateDiscussionPrompts(scenes[i]);
    scenes[i].discussionPrompts = discussion;
  }

  // Step 6: Final assembly
  updateProgress("Assembling experience...", 95);
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

For each scene, provide:
- title: A short, engaging scene title
- content: The core teaching content of this scene (2-3 paragraphs from the sermon)
- scriptureRef: Any Bible verse referenced in this section
- keyPoint: The single most important idea in this scene
- emotion: The emotional tone (joy, wonder, conviction, comfort, etc.)
- imagePrompt: A detailed DALL-E prompt for a warm, child-friendly watercolor-style illustration. The style should be: soft watercolor with warm lighting, diverse characters, biblical setting with gentle colors, suitable for children ages 4-12. Never include text in images. Be specific about the scene composition.
- animationHint: "zoom-in", "pan-left", "pan-right", "zoom-out", or "fade" - suggests the Ken Burns motion

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
  });
  const parsed = JSON.parse(response.choices[0].message.content || '{"scenes":[]}');
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

Create 2 questions for each age group (6 total). Young questions should be very simple true/false or picture-based. Older questions multiple choice. Family questions can be deeper.`,
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
