import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, BookOpen, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { AgeGroup } from "@/pages/viewer";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  scene: any;
  sceneIndex: number;
  totalScenes: number;
  ageGroup: AgeGroup;
  userName: string;
  sermonId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const EMOTION_GRADIENTS: Record<string, string> = {
  curiosity: "from-[#1d88a9] via-[#54636c] to-[#0f1d2e]",
  surprise: "from-[#80ad40] via-[#7c6752] to-[#0f1d2e]",
  conviction: "from-slate-800 via-[#785992] to-[#0f1d2e]",
  sadness: "from-[#54636c] via-slate-800 to-[#0f1d2e]",
  compassion: "from-[#1d88a9] via-[#785992] to-[#0f1d2e]",
  urgency: "from-[#7c6752] via-[#785992] to-[#0f1d2e]",
  hope: "from-[#80ad40] via-[#1d88a9] to-[#0f1d2e]",
  transformation: "from-[#80ad40] via-[#1d88a9] to-[#785992]",
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

export default function SceneViewer({ scene, sceneIndex, totalScenes, ageGroup, userName, sermonId, onComplete, onSkip }: Props) {
  const [narrationDone, setNarrationDone] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(scene.videoUrl || null);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [narrationStarted, setNarrationStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAbortRef = useRef(false);

  const narrative = scene.narratives?.[ageGroup] || scene.content;
  const gradient = EMOTION_GRADIENTS[scene.emotion] || EMOTION_GRADIENTS.hope;
  const icon = EMOTION_ICONS[scene.emotion] || "📖";

  const hasVideo = !!videoUrl;

  const startNarration = useCallback(async () => {
    if (narrationStarted || narrationAbortRef.current) return;
    setNarrationStarted(true);

    try {
      const res = await apiRequest("POST", "/api/tts", { text: narrative, voice: "nova" });
      if (narrationAbortRef.current) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setNarrationDone(true);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        fallbackSpeak(narrative);
      };
      audio.play().catch(() => {
        fallbackSpeak(narrative);
      });
    } catch {
      fallbackSpeak(narrative);
    }
  }, [narrative, narrationStarted]);

  function fallbackSpeak(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.05;
    u.onend = () => setNarrationDone(true);
    speechSynthesis.speak(u);
  }

  useEffect(() => {
    narrationAbortRef.current = false;
    setNarrationDone(false);
    setVideoDone(false);
    setShowContent(false);
    setShowButtons(false);
    setNarrationStarted(false);
    setVideoUrl(scene.videoUrl || null);
    setVideoBuffering(false);

    const contentTimer = setTimeout(() => setShowContent(true), 500);

    startNarration();

    return () => {
      narrationAbortRef.current = true;
      clearTimeout(contentTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      speechSynthesis.cancel();
    };
  }, [sceneIndex]);

  useEffect(() => {
    if (scene.videoUrl && scene.videoUrl !== videoUrl) {
      setVideoUrl(scene.videoUrl);
    }
  }, [scene.videoUrl]);

  useEffect(() => {
    if (hasVideo) {
      if (narrationDone && videoDone) {
        setShowButtons(true);
      }
    } else {
      if (narrationDone) {
        setShowButtons(true);
      }
    }
  }, [narrationDone, videoDone, hasVideo]);

  useEffect(() => {
    if (!hasVideo) {
      const fallbackTimer = setTimeout(() => setVideoDone(true), 8000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [hasVideo, sceneIndex]);

  function toggleMute() {
    setIsMuted((m) => {
      const newMuted = !m;
      if (audioRef.current) {
        audioRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }

  const isLast = sceneIndex + 1 >= totalScenes;

  return (
    <div className="pb-24 relative">
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-900">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl!}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              poster={scene.imageUrl || undefined}
              onEnded={() => {
                setVideoDone(true);
              }}
              onLoadedData={() => {
                setVideoBuffering(false);
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onError={() => {
                setVideoUrl(null);
                setVideoDone(true);
              }}
              onWaiting={() => setVideoBuffering(true)}
              onPlaying={() => setVideoBuffering(false)}
              onCanPlay={() => setVideoBuffering(false)}
            />
            {videoBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </>
        ) : (
          <>
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={scene.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-7xl block mb-2">{icon}</span>
              </div>
            )}
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/60 to-transparent" />

        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
          <BookOpen className="w-3 h-3 text-se-blue" />
          <span className="text-gray-700 text-xs font-display font-bold">Scene {sceneIndex + 1}</span>
        </div>

        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white/90 transition-colors shadow-sm"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-gray-600" />
          ) : (
            <Volume2 className="w-4 h-4 text-gray-600" />
          )}
        </button>

        
      </div>

      <div className="px-5 -mt-10 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-2xl font-extrabold text-gray-800 mb-1"
        >
          {scene.title}
        </motion.h2>

        {scene.scriptureRef && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-se-blue font-display text-sm font-semibold mb-4"
          >
            {scene.scriptureRef}
          </motion.p>
        )}

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-5"
            >
              <p className="text-gray-700 font-story text-sm leading-relaxed">
                {narrative}
              </p>

              <div className="mt-4 bg-se-blue/10 border border-se-blue/20 rounded-xl p-3">
                <p className="text-se-blue font-display text-xs font-bold mb-1">KEY POINT</p>
                <p className="text-gray-700 font-display text-sm font-semibold">
                  {scene.keyPoint}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showButtons && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-5 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                         hover:bg-se-blue/90 transition-all shadow-lg shadow-se-blue/20"
            >
              <span className="font-display font-bold text-white text-sm">
                {isLast ? "Finish Story" : "Next Scene"}
              </span>
              <ChevronRight className="w-4 h-4 text-white" />
            </motion.button>

            <button
              onClick={onSkip}
              className="w-full mt-2 py-2 text-center"
            >
              <span className="font-display text-xs text-gray-300 hover:text-gray-500 transition-colors">
                Skip to next
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showButtons && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-5 pt-4">
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-se-blue animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-se-blue animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-se-blue animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="font-display text-xs text-gray-400">
              {!narrationDone ? "Listening..." : "Preparing..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
