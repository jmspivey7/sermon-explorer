import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, SkipForward, Trophy, Sparkles } from "lucide-react";
import type { AgeGroup } from "@/pages/viewer";

interface Props {
  scene: any;
  ageGroup: AgeGroup;
  onComplete: (correct: number, total: number) => void;
  onSkip: () => void;
}

export default function SceneQuiz({ scene, ageGroup, onComplete, onSkip }: Props) {
  const quiz = scene.quiz || [];
  // Filter questions for this age group
  const questions = quiz.filter(
    (q: any) => q.ageGroup === ageGroup || q.ageGroup === "all"
  );

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answered, setAnswered] = useState(false);

  if (questions.length === 0) {
    // No quiz for this age group – skip
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-white/60 font-display mb-4">No quiz for this scene</p>
        <button onClick={onSkip} className="text-se-teal font-display font-bold underline">
          Continue
        </button>
      </div>
    );
  }

  const q = questions[currentQ];
  const isCorrect = selected === q.correctIndex;
  const total = questions.length;
  const isLast = currentQ + 1 >= total;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setShowResult(true);
    if (idx === q.correctIndex) {
      setCorrect((c) => c + 1);
    }
  }

  function handleNext() {
    if (isLast) {
      const finalCorrect = selected === q.correctIndex ? correct : correct;
      onComplete(finalCorrect, total);
    } else {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setShowResult(false);
      setAnswered(false);
    }
  }

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="px-5 py-6">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-se-amber" />
          <span className="font-display font-bold text-white text-sm">Quiz Time!</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-display text-xs">
            {currentQ + 1} / {total}
          </span>
          <button onClick={onSkip} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <SkipForward className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-6">
        {questions.map((_: any, i: number) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < currentQ ? "bg-se-teal" : i === currentQ ? "bg-se-amber" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <motion.div
        key={currentQ}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-white font-display font-bold text-lg mb-6 leading-snug">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((option: string, idx: number) => {
            let bg = "bg-white/8 border-white/15";
            let textColor = "text-white/90";
            let letterBg = "bg-white/10";

            if (showResult && idx === q.correctIndex) {
              bg = "bg-green-500/20 border-green-500/50";
              textColor = "text-green-300";
              letterBg = "bg-green-500/30";
            } else if (showResult && idx === selected && !isCorrect) {
              bg = "bg-red-500/20 border-red-500/50";
              textColor = "text-red-300";
              letterBg = "bg-red-500/30";
            } else if (selected === idx && !showResult) {
              bg = "bg-se-teal/20 border-se-teal/50";
            }

            return (
              <motion.button
                key={idx}
                whileTap={!answered ? { scale: 0.98 } : undefined}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`w-full rounded-2xl p-4 border ${bg} flex items-center gap-3 transition-all`}
              >
                <span className={`w-8 h-8 rounded-full ${letterBg} flex items-center justify-center font-display font-bold text-sm ${textColor}`}>
                  {optionLetters[idx]}
                </span>
                <span className={`font-display text-sm font-semibold ${textColor} text-left flex-1`}>
                  {option}
                </span>
                {showResult && idx === q.correctIndex && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {showResult && idx === selected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Result & Explanation */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className={`rounded-2xl p-4 border ${
              isCorrect
                ? "bg-green-500/10 border-green-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <Trophy className="w-4 h-4 text-green-400" />
                    <span className="font-display font-bold text-green-400 text-sm">Great job!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-display font-bold text-amber-400 text-sm">Good try!</span>
                  </>
                )}
              </div>
              {q.explanation && (
                <p className="text-white/70 font-story text-sm leading-relaxed">{q.explanation}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Next Button */}
        {showResult && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full rounded-2xl p-4 bg-se-teal flex items-center justify-center gap-2
                       hover:bg-se-teal/90 transition-all"
          >
            <span className="font-display font-bold text-se-navy text-sm">
              {isLast ? "See Discussion" : "Next Question"}
            </span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
