import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";

export default function Sermons() {
  const [, setLocation] = useLocation();

  const { data: sermons } = useQuery<any[]>({
    queryKey: ["/api/sermons"],
    queryFn: async () => {
      const res = await fetch("/api/sermons");
      return res.json();
    },
  });

  const allSermons = sermons || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-3 flex items-center gap-3 sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <button
          onClick={() => setLocation("/")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-display font-bold text-gray-800 text-lg">
            <span className="font-accent text-2xl text-se-blue">Sermon</span>{" "}
            <span className="font-accent text-2xl text-gray-800">Explorer</span>
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="font-display font-bold text-gray-400 text-sm uppercase tracking-wider mb-4">
          Available Sermons
        </h2>

        <div className="space-y-3">
          {allSermons.filter(s => s.status === "ready").map((sermon) => (
            <motion.button
              key={sermon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation(`/view/${sermon.id}`)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5
                         flex items-center gap-4 text-left
                         hover:bg-gray-100 hover:border-se-blue/50 transition-all group shadow-sm"
            >
              <div className="w-14 h-14 rounded-xl bg-se-blue/10 flex items-center justify-center
                              group-hover:bg-se-blue/20 transition-colors flex-shrink-0">
                <BookOpen className="w-7 h-7 text-se-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-gray-800 truncate">
                  {sermon.title}
                </h3>
                <p className="text-gray-500 text-sm">{sermon.scripture}</p>
                <p className="text-se-blue text-xs mt-1">{sermon.sceneCount} scenes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-se-blue transition-colors" />
            </motion.button>
          ))}

          {allSermons.filter(s => s.status === "processing").map((sermon) => (
            <div
              key={sermon.id}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5
                         flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-se-green/10 flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 border-2 border-se-green border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-600">{sermon.title}</h3>
                <p className="text-se-green text-xs">Processing...</p>
              </div>
            </div>
          ))}

          {allSermons.filter(s => s.status === "ready").length === 0 &&
           allSermons.filter(s => s.status === "processing").length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-display">No sermons available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
