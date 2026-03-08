import { motion } from "framer-motion";
import { Trophy, Star, Home, RotateCcw, BookOpen, Sparkles } from "lucide-react";

interface Props {
  sermon: any;
  score: number;
  totalQuestions: number;
  userName: string;
  onRestart: () => void;
  onHome: () => void;
}

function getGrade(pct: number) {
  if (pct >= 90) return { label: "Bible Scholar!", emoji: "🏆", color: "text-yellow-400" };
  if (pct >= 70) return { label: "Great Explorer!", emoji: "⭐", color: "text-se-green" };
  if (pct >= 50) return { label: "Good Listener!", emoji: "👏", color: "text-se-blue" };
  return { label: "Keep Learning!", emoji: "📖", color: "text-se-purple" };
}

export default function FinalSummary({ sermon, score, totalQuestions, userName, onRestart, onHome }: Props) {
  const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const grade = getGrade(pct);
  const scenes = sermon.scenes || [];

  return (
    <div className="px-5 py-8">
      {/* Celebration Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-3">{grade.emoji}</div>
        <h1 className="font-display text-3xl font-extrabold text-white mb-1">
          {grade.label}
        </h1>
        <p className="text-white/50 font-display text-sm">
          {userName ? `Well done, ${userName}!` : "Well done!"}
        </p>
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/8 border border-white/15 rounded-3xl p-6 mb-6"
      >
        <div className="flex items-center justify-around">
          {/* Score */}
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Trophy className="w-5 h-5 text-se-green" />
              <span className={`font-display text-3xl font-extrabold ${grade.color}`}>
                {pct}%
              </span>
            </div>
            <p className="text-white/40 font-display text-xs">Quiz Score</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-white/15" />

          {/* Scenes Completed */}
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <BookOpen className="w-5 h-5 text-se-blue" />
              <span className="font-display text-3xl font-extrabold text-se-blue">
                {scenes.length}
              </span>
            </div>
            <p className="text-white/40 font-display text-xs">Scenes Explored</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-white/15" />

          {/* Questions */}
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="font-display text-3xl font-extrabold text-yellow-400">
                {score}
              </span>
            </div>
            <p className="text-white/40 font-display text-xs">Correct</p>
          </div>
        </div>
      </motion.div>

      {/* Key Takeaways */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-se-green" />
          <h3 className="font-display font-bold text-white text-sm"><span className="font-accent text-lg text-se-green">Key</span> Takeaways</h3>
        </div>
        <div className="space-y-2">
          {scenes.map((scene: any, idx: number) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-se-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-se-blue font-display text-xs font-bold">{idx + 1}</span>
              </div>
              <div>
                <p className="text-white font-display text-sm font-semibold">{scene.title}</p>
                <p className="text-white/50 font-story text-xs mt-0.5">{scene.keyPoint}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sermon Info */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-se-blue/10 border border-se-blue/20 rounded-2xl p-4 mb-8 text-center"
      >
        <p className="text-se-blue font-display text-xs font-bold mb-1">BASED ON</p>
        <p className="text-white font-display font-bold text-sm">{sermon.title}</p>
        {sermon.church && (
          <p className="text-white/50 font-display text-xs mt-0.5">{sermon.church}</p>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <button
          onClick={onRestart}
          className="w-full rounded-2xl p-4 bg-se-blue flex items-center justify-center gap-2
                     hover:bg-se-blue/90 transition-all"
        >
          <RotateCcw className="w-5 h-5 text-se-navy" />
          <span className="font-display font-bold text-se-navy text-sm">Explore Again</span>
        </button>

        <button
          onClick={onHome}
          className="w-full rounded-2xl p-4 bg-white/10 border border-white/20
                     flex items-center justify-center gap-2 hover:bg-white/15 transition-all"
        >
          <Home className="w-5 h-5 text-white/70" />
          <span className="font-display font-bold text-white text-sm">Back to Home</span>
        </button>
      </motion.div>
    </div>
  );
}
