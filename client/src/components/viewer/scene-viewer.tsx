import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, ChevronRight, SkipForward, BookOpen } from "lucide-react";
import type { AgeGroup } from "@/pages/viewer";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  scene: any;
  sceneIndex: number;
  ageGroup: AgeGroup;
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
}

// Placeholder illustration colors based on scene emotion
const EMOTION_GRADIENTS: Record<string, string> = {
  curiosity: "from-amber-800 via-teal-900 to-blue-900",
  surprise: "from-yellow-800 via-orange-900 to-red-900",
  conviction: "from-slate-800 via-indigo-900 to-purple-900",
  sadness: "from-blue-900 via-slate-800 to-gray-900",
  compassion: "from-teal-800 via-cyan-900 to-blue-900",
  urgency: "from-amber-900 via-red-900 to-rose-900",
  hope: "from-amber-700 via-yellow-800 to-orange-900",
  transformation: "from-green-800 via-teal-800 to-cyan-900",
};

const EMOTION_ICONS: Record<string, string> = {
  curiosity: "🏛️",
  surprise: "😮",
  conviction: "🪞",
  sadness: "😢",
  compassion: "🤲",
  urgency: "🔑",
  hope: "🌅",
  transformation: "🦋",
};

export default function SceneViewer({ scene, sceneIndex, ageGroup, userName, onComplete, onSkip }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const narrative = scene.narratives?.[ageGroup] || scene.content;
  const gradient = EMOTION_GRADIENTS[scene.emotion] || EMOTION_GRADIENTS.hope;
  const icon = EMOTION_ICONS[scene.emotion] || "📖";
  const kenBurnsClass = `ken-${scene.animationHint || "zoom-in"}`;

  useEffect(() => {
    // Auto-show text after a brief delay for the animation to settle
    const timer = setTimeout(() => setShowText(true), 800);
    return () => clearTimeout(timer);
  }, [sceneIndex]);

  async function speakNarrative() {
    setSpeaking(true);
    try {
      const res = await apiRequest("POST", "/api/tts", { text: narrative, voice: "nova" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => {
        setSpeaking(false);
        fallbackSpeak(narrative);
      };
      audio.play();
    } catch {
      fallbackSpeak(narrative);
    }
  }

  function fallbackSpeak(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.05;
    u.onend = () => setSpeaking(false);
    speechSynthesis.speak(u);
  }

  return (
    <div className="pb-8">
      {/* Scene Illustration Area */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className={`w-full h-full object-cover ${kenBurnsClass}`}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center ${kenBurnsClass}`}>
            <div className="text-center">
              <span className="text-7xl block mb-2">{icon}</span>
              <p className="text-white/30 font-display text-xs">Illustration generating...</p>
            </div>
          </div>
        )}

        {/* Overlay gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-se-navy to-transparent" />

        {/* Scene number badge */}
        <div className="absolute top-4 left-4 bg-se-navy/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-se-teal" />
          <span className="text-white/80 text-xs font-display font-bold">Scene {sceneIndex + 1}</span>
        </div>
      </div>

      {/* Scene Content */}
      <div className="px-5 -mt-6 relative z-10">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-2xl font-extrabold text-white mb-1"
        >
          {scene.title}
        </motion.h2>

        {scene.scriptureRef && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-se-teal font-display text-sm font-semibold mb-4"
          >
            {scene.scriptureRef}
          </motion.p>
        )}

        {/* Narrative Text */}
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-5"
          >
            <p className="text-white/90 font-story text-sm leading-relaxed">
              {narrative}
            </p>

            {/* Key Point */}
            <div className="mt-4 bg-se-teal/10 border border-se-teal/30 rounded-xl p-3">
              <p className="text-se-teal font-display text-xs font-bold mb-1">KEY POINT</p>
              <p className="text-white/80 font-display text-sm font-semibold">
                {scene.keyPoint}
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileTap={{ scale: 0.98 }}
            onClick={speakNarrative}
            disabled={speaking}
            className="w-full rounded-2xl p-4 bg-white/10 border border-white/20
                       flex items-center justify-center gap-2
                       hover:bg-white/15 transition-all disabled:opacity-50"
          >
            <Volume2 className={`w-5 h-5 text-se-amber ${speaking ? "animate-pulse" : ""}`} />
            <span className="font-display font-bold text-white text-sm">
              {speaking ? "Reading..." : "Read to Me"}
            </span>
          </motion.button>

          <div className="flex gap-3">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSkip}
              className="flex-1 rounded-2xl p-4 bg-white/5 border border-white/10
                         flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <SkipForward className="w-4 h-4 text-white/50" />
              <span className="font-display font-semibold text-white/50 text-sm">Skip</span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              className="flex-[2] rounded-2xl p-4 bg-se-teal
                         flex items-center justify-center gap-2 hover:bg-se-teal/90 transition-all"
            >
              <span className="font-display font-bold text-se-navy text-sm">Continue</span>
              <ChevronRight className="w-4 h-4 text-se-navy" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
