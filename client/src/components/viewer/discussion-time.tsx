import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ChevronRight, Heart, Users } from "lucide-react";

interface Props {
  scene: any;
  onComplete: () => void;
  isLastScene: boolean;
}

export default function DiscussionTime({ scene, onComplete, isLastScene }: Props) {
  const prompts = scene.discussionPrompts || [];
  const [revealedCount, setRevealedCount] = useState(1);

  function revealNext() {
    setRevealedCount((c) => Math.min(c + 1, prompts.length));
  }

  if (prompts.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-white/60 font-display mb-4">No discussion prompts for this scene</p>
        <button onClick={onComplete} className="text-se-teal font-display font-bold underline">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-se-coral/20 flex items-center justify-center mx-auto mb-3">
          <Users className="w-8 h-8 text-se-coral" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-white mb-1">
          Family Discussion
        </h2>
        <p className="text-white/50 font-display text-sm">
          Talk about what you learned together
        </p>
      </div>

      {/* Scene context */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <p className="text-se-teal font-display text-xs font-bold mb-1">FROM THIS SCENE</p>
        <p className="text-white font-display font-semibold text-sm">{scene.title}</p>
        {scene.keyPoint && (
          <p className="text-white/60 font-story text-sm mt-1">{scene.keyPoint}</p>
        )}
      </div>

      {/* Discussion Prompts */}
      <div className="space-y-4 mb-6">
        {prompts.slice(0, revealedCount).map((prompt: string, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className="bg-white/8 border border-white/15 rounded-2xl p-5"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-se-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-se-amber" />
              </div>
              <div>
                <p className="text-se-amber font-display text-xs font-bold mb-1">
                  QUESTION {idx + 1}
                </p>
                <p className="text-white/90 font-story text-sm leading-relaxed">
                  {prompt}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reveal more button */}
      {revealedCount < prompts.length && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          onClick={revealNext}
          className="w-full rounded-2xl p-4 bg-white/5 border border-white/10
                     flex items-center justify-center gap-2 mb-4
                     hover:bg-white/10 transition-all"
        >
          <Heart className="w-4 h-4 text-se-coral" />
          <span className="font-display font-semibold text-white/70 text-sm">
            Show Another Question
          </span>
        </motion.button>
      )}

      {/* Encouragement */}
      <div className="bg-se-teal/10 border border-se-teal/20 rounded-2xl p-4 mb-6">
        <p className="text-white/70 font-story text-sm leading-relaxed text-center">
          Take your time with these questions. There are no wrong answers — the goal
          is to listen, share, and grow together.
        </p>
      </div>

      {/* Continue Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className="w-full rounded-2xl p-4 bg-se-teal flex items-center justify-center gap-2
                   hover:bg-se-teal/90 transition-all"
      >
        <span className="font-display font-bold text-se-navy text-sm">
          {isLastScene ? "See Your Results" : "Next Scene"}
        </span>
        <ChevronRight className="w-4 h-4 text-se-navy" />
      </motion.button>
    </div>
  );
}
