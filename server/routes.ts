import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import express from "express";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as any)[prop];
  }
});
const upload = multer({ dest: "uploads/" });

const processedSermons: Map<string, any> = new Map();

const IMAGES_DIR = path.resolve("generated", "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

export async function registerRoutes(server: Server, app: Express) {
  app.use("/generated", express.static(path.resolve("generated")));

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

    const imagesDir = path.resolve("generated", "images");
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        if (file.startsWith(sermonId)) {
          fs.unlinkSync(path.join(imagesDir, file));
        }
      }
    }

    console.log(`Sermon deleted: ${sermonId}`);
    res.json({ message: "Sermon deleted" });
  });

  app.get("/api/sermons/:id/scenes/:sceneIndex", (req, res) => {
    const sermon = processedSermons.get(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });
    const scene = sermon.scenes?.[parseInt(req.params.sceneIndex)];
    if (!scene) return res.status(404).json({ message: "Scene not found" });
    res.json(scene);
  });

  app.post("/api/upload", upload.single("sermon"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const sermonId = `sermon-${Date.now()}`;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
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
      fs.unlink(filePath, () => {});
    }
  });

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

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, sceneIndex, sermonId } = req.body;
      const imageUrl = await generateImage(prompt, sermonId, sceneIndex);

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

async function processSermon(sermonId: string, text: string) {
  const sermon = processedSermons.get(sermonId)!;

  const updateProgress = (step: string, progress: number) => {
    sermon.currentStep = step;
    sermon.progress = progress;
  };

  updateProgress("Analyzing sermon structure...", 10);
  const analysis = await analyzeSermon(text);
  sermon.title = analysis.title;
  sermon.scripture = analysis.scripture;
  sermon.summary = analysis.summary;
  sermon.keyThemes = analysis.keyThemes;

  updateProgress("Breaking sermon into scenes...", 20);
  const scenes = await generateScenes(text, analysis);
  sermon.scenes = scenes;

  updateProgress("Writing age-appropriate narratives...", 35);
  for (let i = 0; i < scenes.length; i++) {
    updateProgress(`Writing narratives for scene ${i + 1}/${scenes.length}...`, 35 + (i / scenes.length) * 15);
    const narratives = await generateNarratives(scenes[i]);
    scenes[i].narratives = narratives;
  }

  updateProgress("Generating illustrations...", 50);
  for (let i = 0; i < scenes.length; i++) {
    updateProgress(`Illustrating scene ${i + 1}/${scenes.length}...`, 50 + (i / scenes.length) * 25);
    try {
      const imageUrl = await generateImage(scenes[i].imagePrompt, sermonId, i);
      scenes[i].imageUrl = imageUrl;
    } catch (err) {
      console.error(`Image gen failed for scene ${i}:`, err);
      scenes[i].imageUrl = null;
    }
  }

  updateProgress("Creating quizzes and discussion prompts...", 80);
  for (let i = 0; i < scenes.length; i++) {
    const quiz = await generateQuiz(scenes[i].content, "mixed");
    scenes[i].quiz = quiz;
    const discussion = await generateDiscussionPrompts(scenes[i]);
    scenes[i].discussionPrompts = discussion;
  }

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
- All visuals must be in a colorful, cinematic 3D animated style with expressive, big-eyed characters and soft global lighting, similar to a modern family animated feature film. NOT realistic, NOT watercolor. No copyrighted characters or recognizable brands.
- NEVER depict God, Jesus, or the Holy Spirit as a character or figure. Instead, represent their presence through symbolic imagery: warm golden light, a gentle breeze, glowing clouds, a radiant sunrise, a guiding star, a comforting glow, or other abstract/symbolic visuals.
- Characters must NEVER have open mouths or appear to be speaking.

REAL-WORLD ILLUSTRATION RULE:
- If the pastor used a memorable real-world example, analogy, or personal story in the sermon (e.g., jumping off a high dive to illustrate overcoming fear, or a child sharing a lunchbox to illustrate generosity), then 1-2 of the scenes (roughly 10-20% of total scenes) should have their imagePrompt depict that real-world illustration in a modern-day setting rather than a biblical setting. These scenes should still use the same colorful cinematic 3D animated style, but show the modern scenario the pastor described (a swimming pool, a school cafeteria, etc.).
- If the sermon does NOT contain any real-world examples or personal stories, then ALL imagePrompts should use biblical settings as usual. Do not force modern-day scenes if none exist in the sermon.

For each scene, provide:
- title: A short, engaging scene title
- content: The core teaching content of this scene (2-3 paragraphs from the sermon)
- scriptureRef: Any Bible verse referenced in this section
- keyPoint: The single most important idea in this scene
- emotion: The emotional tone (joy, wonder, conviction, comfort, etc.)
- imagePrompt: A detailed image generation prompt for a colorful, cinematic 3D animated style illustration with expressive, big-eyed characters and soft global lighting, similar to a modern family animated feature film. Warm cinematic lighting. Suitable for children ages 4-12. No copyrighted characters or recognizable brands. Never include text or words in images. Never depict God or Jesus as a character — use symbolic light, glowing clouds, or radiant warmth instead. No characters should have open mouths or appear to be speaking. The image should be widescreen (16:9 aspect ratio) with rich detail and depth. For scenes based on the pastor's real-world illustrations, use a modern-day setting that matches the story described. For all other scenes, use a biblical setting.
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

CRITICAL RULES: Colorful cinematic 3D animated style only, like a modern family animated feature film (NOT realistic). No copyrighted characters or recognizable brands. NEVER depict God, Jesus, or the Holy Spirit — use symbolic light/warmth instead. No open mouths on characters.

REAL-WORLD ILLUSTRATIONS: If the pastor used real-world examples or personal stories, 1-2 scenes (10-20%) should depict those modern-day illustrations instead of biblical settings. If no real-world examples exist, use biblical settings for all scenes.

For each scene, provide:
- title: A short, engaging scene title
- content: The core teaching content of this scene (1-2 paragraphs from the sermon)
- scriptureRef: Any Bible verse referenced in this section
- keyPoint: The single most important idea in this scene
- emotion: The emotional tone (joy, wonder, conviction, comfort, etc.)
- imagePrompt: A prompt for a colorful cinematic 3D animated style illustration with expressive big-eyed characters and soft global lighting, like a modern family animated feature film. Warm cinematic lighting. No copyrighted characters or recognizable brands. No text. Never depict God or Jesus — use symbolic light. No open mouths. Widescreen 16:9 with rich detail. Use modern-day setting for scenes based on pastor's real-world stories; biblical setting for all others.
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

async function generateImage(prompt: string, sermonId?: string, sceneIndex?: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for image generation");

  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey });

  console.log(`Generating image with Imagen 4 for ${sermonId || "on-demand"} scene ${sceneIndex ?? "?"}`);

  const response = await client.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("Imagen returned no images");
  }

  const imageBytes = response.generatedImages[0].image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Imagen returned empty image data");
  }

  const filename = sermonId && sceneIndex !== undefined
    ? `${sermonId}-scene${sceneIndex}.png`
    : `image-${Date.now()}.png`;

  const filePath = path.join(IMAGES_DIR, filename);
  const buffer = Buffer.from(imageBytes, "base64");
  fs.writeFileSync(filePath, buffer);
  console.log(`Image saved: ${filePath} (${(buffer.length / 1024).toFixed(0)}KB)`);

  return `/generated/images/${filename}`;
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
