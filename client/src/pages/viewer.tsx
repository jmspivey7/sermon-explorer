import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Settings } from "lucide-react";
import StorySetup from "@/components/viewer/story-setup";
import SceneViewer from "@/components/viewer/scene-viewer";
import SceneQuiz from "@/components/viewer/scene-quiz";
import DiscussionTime from "@/components/viewer/discussion-time";
import FinalSummary from "@/components/viewer/final-summary";

export type AgeGroup = "young" | "older" | "family";
export type ViewerPhase = "setup" | "scene" | "quiz" | "discussion" | "summary";

export default function Viewer() {
  const [, setLocation] = useLocation();
  const params = useParams<{ sermonId: string }>();

  const [phase, setPhase] = useState<ViewerPhase>("setup");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("older");
  const [currentScene, setCurrentScene] = useState(0);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [userName, setUserName] = useState("");

  const { data: sermon, isLoading } = useQuery<any>({
    queryKey: [`/api/sermons/${params.sermonId}`],
    queryFn: async () => {
      const res = await fetch(`/api/sermons/${params.sermonId}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-se-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sermon || !sermon.scenes) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-gray-500">Sermon not found</p>
        <button onClick={() => setLocation("/sermons")} className="mt-4 text-se-blue underline">Go back</button>
      </div>
    );
  }

  const scenes = sermon.scenes;
  const totalScenes = scenes.length;

  function handleSetupComplete(age: AgeGroup, name: string) {
    setAgeGroup(age);
    setUserName(name);
    setPhase("scene");
  }

  function handleSceneComplete() {
    setPhase("quiz");
  }

  function handleQuizComplete(correct: number, total: number) {
    setScore((prev) => prev + correct);
    setTotalQuestions((prev) => prev + total);
    setPhase("discussion");
  }

  function handleDiscussionComplete() {
    if (currentScene + 1 < totalScenes) {
      setCurrentScene((prev) => prev + 1);
      setPhase("scene");
    } else {
      setPhase("summary");
    }
  }

  function handleSkipToNext() {
    if (phase === "scene") {
      setPhase("quiz");
    } else if (phase === "quiz") {
      setPhase("discussion");
    } else if (phase === "discussion") {
      if (currentScene + 1 < totalScenes) {
        setCurrentScene((prev) => prev + 1);
        setPhase("scene");
      } else {
        setPhase("summary");
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {phase !== "setup" && (
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <button
            onClick={() => {
              if (phase === "scene" && currentScene === 0) {
                setPhase("setup");
              } else if (phase === "scene") {
                setCurrentScene((p) => p - 1);
              } else {
                setPhase("scene");
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 mx-4">
            <div className="flex items-center gap-1">
              {scenes.map((_: any, i: number) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    i < currentScene ? "bg-se-blue" : i === currentScene ? "bg-se-green" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-400 text-[10px] text-center mt-1 font-display">
              Scene {currentScene + 1} of {totalScenes}
            </p>
          </div>

          <div className="p-2 text-gray-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StorySetup
              sermon={sermon}
              onComplete={handleSetupComplete}
              onBack={() => setLocation("/sermons")}
            />
          </motion.div>
        )}

        {phase === "scene" && (
          <motion.div
            key={`scene-${currentScene}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
          >
            <SceneViewer
              scene={scenes[currentScene]}
              sceneIndex={currentScene}
              totalScenes={totalScenes}
              ageGroup={ageGroup}
              userName={userName}
              sermonId={params.sermonId || ""}
              onComplete={handleSceneComplete}
              onSkip={handleSkipToNext}
            />
          </motion.div>
        )}

        {phase === "quiz" && (
          <motion.div
            key={`quiz-${currentScene}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <SceneQuiz
              scene={scenes[currentScene]}
              ageGroup={ageGroup}
              onComplete={handleQuizComplete}
              onSkip={handleSkipToNext}
            />
          </motion.div>
        )}

        {phase === "discussion" && (
          <motion.div
            key={`discussion-${currentScene}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <DiscussionTime
              scene={scenes[currentScene]}
              onComplete={handleDiscussionComplete}
              onSkip={handleSkipToNext}
              isLastScene={currentScene + 1 >= totalScenes}
            />
          </motion.div>
        )}

        {phase === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <FinalSummary
              sermon={sermon}
              score={score}
              totalQuestions={totalQuestions}
              userName={userName}
              onRestart={() => { setCurrentScene(0); setScore(0); setTotalQuestions(0); setPhase("setup"); }}
              onHome={() => setLocation("/sermons")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
