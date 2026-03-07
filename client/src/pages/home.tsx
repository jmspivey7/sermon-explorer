import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Upload, ChevronRight } from "lucide-react";
const cdmLogo = "/cdm-logo.webp";

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: sermons } = useQuery<any[]>({
    queryKey: ["/api/sermons"],
    queryFn: async () => {
      const res = await fetch("/api/sermons");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-se-navy via-[#1e3454] to-se-navy">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img src={cdmLogo} alt="CDM Discipleship Ministries" className="h-16 mx-auto mb-4" />
          <h1 className="font-display text-5xl font-extrabold text-white mb-3">
            Sermon Explorer
          </h1>
          <p className="text-se-teal font-display text-lg font-semibold">
            Sunday's Sermon, Brought to Life
          </p>
          <p className="text-white/50 mt-2 text-sm max-w-md mx-auto">
            Interactive illustrated storybooks that transform weekly sermons into
            engaging family experiences for all ages
          </p>
        </motion.div>
      </div>

      {/* Available Sermons */}
      <div className="max-w-lg mx-auto px-6 pb-8">
        <h2 className="font-display font-bold text-white/80 text-sm uppercase tracking-wider mb-4">
          Available Sermons
        </h2>

        <div className="space-y-3">
          {sermons?.filter(s => s.status === "ready").map((sermon) => (
            <motion.button
              key={sermon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation(`/view/${sermon.id}`)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5
                         flex items-center gap-4 text-left
                         hover:bg-white/15 hover:border-se-teal/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-se-teal/20 flex items-center justify-center
                              group-hover:bg-se-teal/30 transition-colors flex-shrink-0">
                <BookOpen className="w-7 h-7 text-se-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-white truncate">
                  {sermon.title}
                </h3>
                <p className="text-white/50 text-sm">{sermon.scripture}</p>
                <p className="text-se-teal text-xs mt-1">{sermon.sceneCount} scenes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-se-teal transition-colors" />
            </motion.button>
          ))}

          {sermons?.filter(s => s.status === "processing").map((sermon) => (
            <div
              key={sermon.id}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5
                         flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-se-amber/20 flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 border-2 border-se-amber border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white/70">{sermon.title}</h3>
                <p className="text-se-amber text-xs">Processing...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Button */}
      <div className="max-w-lg mx-auto px-6 pb-16">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/upload")}
          className="w-full bg-se-teal/20 border-2 border-dashed border-se-teal/40 rounded-2xl p-5
                     flex items-center justify-center gap-3
                     hover:bg-se-teal/30 hover:border-se-teal/60 transition-all"
        >
          <Upload className="w-5 h-5 text-se-teal" />
          <span className="font-display font-bold text-se-teal">
            Upload New Sermon
          </span>
        </motion.button>
      </div>

      {/* Footer */}
      <p className="text-center text-white/20 text-xs pb-6">
        Powered by AI  &middot;  Built for Families  &middot;  PCA CDM
      </p>
    </div>
  );
}
