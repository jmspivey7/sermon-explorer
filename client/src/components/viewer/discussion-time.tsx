import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ChevronRight, Heart, Users } from "lucide-react";

interface Props {
  scene: any;
  onComplete: () => void;
  onSkip: () => void;
  isLastScene: boolean;
}

export default function DiscussionTime({ scene, onComplete, onSkip, isLastScene }: Props) {
  const rawPrompts = scene.discussionPrompts || [];
  const promptObjects = Array.isArray(rawPrompts) ? rawPrompts : (rawPrompts.prompts || []);
  const prompts = promptObjects.map((p: any) => (typeof p === "string" ? p : p.question || ""));
  const [revealedCount, setRevealedCount] = useState(1);

  function revealNext() {
    setRevealedCount((c) => Math.min(c + 1, prompts.length));
  }

  if (prompts.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-gray-500 font-display mb-4">No discussion prompts for this scene</p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                     hover:bg-se-blue/90 transition-all shadow-lg shadow-se-blue/20"
        >
          <span className="font-display font-bold text-white text-sm">Continue</span>
          <ChevronRight className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-se-purple/10 flex items-center justify-center mx-auto mb-3">
          <Users className="w-8 h-8 text-se-purple" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-gray-800 mb-1">
          <span className="font-accent text-2xl text-se-purple">Family</span> Discussion
        </h2>
        <p className="text-gray-500 font-display text-sm">
          Talk about what you learned together
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
        <p className="text-se-blue font-display text-xs font-bold mb-1">FROM THIS SCENE</p>
        <p className="text-gray-800 font-display font-semibold text-sm">{scene.title}</p>
        {scene.keyPoint && (
          <p className="text-gray-500 font-story text-sm mt-1">{scene.keyPoint}</p>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {prompts.slice(0, revealedCount).map((prompt: string, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-se-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-se-green" />
              </div>
              <div>
                <p className="text-se-green font-display text-xs font-bold mb-1">
                  QUESTION {idx + 1}
                </p>
                <p className="text-gray-700 font-story text-sm leading-relaxed">
                  {prompt}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {revealedCount < prompts.length && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          onClick={revealNext}
          className="w-full rounded-2xl p-4 bg-gray-50 border border-gray-200
                     flex items-center justify-center gap-2 mb-4
                     hover:bg-gray-100 transition-all"
        >
          <Heart className="w-4 h-4 text-se-purple" />
          <span className="font-display font-semibold text-gray-600 text-sm">
            Show Another Question
          </span>
        </motion.button>
      )}

      <div className="bg-se-blue/5 border border-se-blue/15 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 font-story text-sm leading-relaxed text-center">
          Take your time with these questions. There are no wrong answers — the goal
          is to listen, share, and grow together.
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                   hover:bg-se-blue/90 transition-all shadow-lg shadow-se-blue/20 mb-2"
      >
        <span className="font-display font-bold text-white text-sm">
          {isLastScene ? "See Your Results" : "Next Scene"}
        </span>
        <ChevronRight className="w-4 h-4 text-white" />
      </motion.button>

      <button
        onClick={onSkip}
        className="w-full py-2 text-center"
      >
        <span className="font-display text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Skip to next scene
        </span>
      </button>
    </div>
  );
}
