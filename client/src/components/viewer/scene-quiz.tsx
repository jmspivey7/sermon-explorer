import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Trophy, Sparkles, ChevronRight } from "lucide-react";
import type { AgeGroup } from "@/pages/viewer";

interface Props {
  scene: any;
  ageGroup: AgeGroup;
  onComplete: (correct: number, total: number) => void;
  onSkip: () => void;
}

export default function SceneQuiz({ scene, ageGroup, onComplete, onSkip }: Props) {
  const rawQuiz = scene.quiz || [];
  const quiz = Array.isArray(rawQuiz) ? rawQuiz : (rawQuiz.questions || []);
  const questions = quiz.filter(
    (q: any) => q.ageGroup === ageGroup || q.ageGroup === "all"
  );

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answered, setAnswered] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-gray-500 font-display mb-4">No quiz for this scene</p>
        <button
          onClick={onSkip}
          className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                     hover:bg-se-blue/90 transition-all shadow-lg shadow-se-blue/20"
        >
          <span className="font-display font-bold text-white text-sm">Continue</span>
          <ChevronRight className="w-4 h-4 text-white" />
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-se-green" />
          <span className="font-display font-bold text-gray-800 text-sm"><span className="font-accent text-lg text-se-green">Quiz</span> Time!</span>
        </div>
        <span className="text-gray-400 font-display text-xs">
          {currentQ + 1} / {total}
        </span>
      </div>

      <div className="flex gap-1.5 mb-6">
        {questions.map((_: any, i: number) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < currentQ ? "bg-se-blue" : i === currentQ ? "bg-se-green" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <motion.div
        key={currentQ}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-gray-800 font-display font-bold text-lg mb-6 leading-snug">
          {q.question}
        </p>

        <div className="space-y-3 mb-4">
          {q.options.map((option: string, idx: number) => {
            let bg = "bg-gray-50 border-gray-200";
            let textColor = "text-gray-700";
            let letterBg = "bg-gray-100";

            if (showResult && idx === q.correctIndex) {
              bg = "bg-green-50 border-green-300";
              textColor = "text-green-700";
              letterBg = "bg-green-100";
            } else if (showResult && idx === selected && !isCorrect) {
              bg = "bg-red-50 border-red-300";
              textColor = "text-red-700";
              letterBg = "bg-red-100";
            } else if (selected === idx && !showResult) {
              bg = "bg-se-blue/10 border-se-blue/50";
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
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {showResult && idx === selected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </motion.button>
            );
          })}
        </div>

        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className={`rounded-2xl p-4 border ${
              isCorrect
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <Trophy className="w-4 h-4 text-green-500" />
                    <span className="font-display font-bold text-green-600 text-sm">Great job!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-display font-bold text-amber-600 text-sm">Good try!</span>
                  </>
                )}
              </div>
              {q.explanation && (
                <p className="text-gray-600 font-story text-sm leading-relaxed">{q.explanation}</p>
              )}
            </div>
          </motion.div>
        )}

        {showResult ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                       hover:bg-se-blue/90 transition-all shadow-lg shadow-se-blue/20 mb-2"
          >
            <span className="font-display font-bold text-white text-sm">
              {isLast ? "See Discussion" : "Next Question"}
            </span>
            <ChevronRight className="w-4 h-4 text-white" />
          </motion.button>
        ) : (
          <button
            onClick={onSkip}
            className="w-full py-2 text-center"
          >
            <span className="font-display text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Skip to discussion
            </span>
          </button>
        )}
      </motion.div>
    </div>
  );
}
