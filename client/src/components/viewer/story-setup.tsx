import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import type { AgeGroup } from "@/pages/viewer";

interface Props {
  sermon: any;
  onComplete: (age: AgeGroup, name: string) => void;
  onBack: () => void;
}

const AGE_OPTIONS: { id: AgeGroup; label: string; range: string; emoji: string; color: string }[] = [
  { id: "young", label: "Little Explorer", range: "Ages 4-6", emoji: "🧸", color: "bg-se-green" },
  { id: "older", label: "Big Explorer", range: "Ages 7-10", emoji: "🌟", color: "bg-se-blue" },
  { id: "family", label: "Family Mode", range: "Ages 11+", emoji: "👨‍👩‍👧‍👦", color: "bg-se-grayblue" },
];

export default function StorySetup({ sermon, onComplete, onBack }: Props) {
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-xl">
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <Sparkles className="w-8 h-8 text-se-green mx-auto mb-3" />
        <h1 className="font-display text-3xl font-extrabold text-white mb-2">
          {sermon.title}
        </h1>
        <p className="font-accent text-2xl text-se-green/80">a storybook journey</p>
        <p className="text-se-blue font-display font-semibold">{sermon.scripture}</p>
        <p className="text-white/50 text-sm mt-3 leading-relaxed">{sermon.summary}</p>

        {/* Name Input */}
        <div className="mt-8">
          <p className="text-white/70 font-display text-sm mb-2">What's your name?</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full text-center text-lg font-display font-bold
                       bg-white/10 border-2 border-white/20 rounded-2xl px-4 py-3
                       text-white placeholder:text-white/30
                       focus:outline-none focus:border-se-blue transition-all"
          />
        </div>

        {/* Age Selection */}
        <div className="mt-6">
          <p className="text-white/70 font-display text-sm mb-3">Choose your level:</p>
          <div className="space-y-2">
            {AGE_OPTIONS.map((opt) => (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedAge(opt.id)}
                className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all
                  ${selectedAge === opt.id
                    ? `${opt.color} shadow-lg`
                    : "bg-white/10 border border-white/20 hover:bg-white/15"
                  }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <h3 className={`font-display font-bold ${
                    selectedAge === opt.id ? "text-se-navy" : "text-white"
                  }`}>{opt.label}</h3>
                  <p className={`text-xs ${
                    selectedAge === opt.id ? "text-se-navy/70" : "text-white/50"
                  }`}>{opt.range}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (selectedAge) onComplete(selectedAge, name || "Explorer");
          }}
          disabled={!selectedAge}
          className="mt-8 w-full child-button bg-se-blue text-se-navy disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <BookOpen className="w-5 h-5 inline mr-2" />
          Begin the Story
        </motion.button>
      </motion.div>
    </div>
  );
}
