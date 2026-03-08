import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, ChevronRight, BookOpen, Music } from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-3 flex items-center gap-3 sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <button
          onClick={() => setLocation("/")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-600" />
          <h1 className="font-display font-bold text-gray-800 text-lg">Admin</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/admin/sermons")}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5
                     flex items-center gap-4 text-left
                     hover:bg-gray-100 hover:border-se-blue/50 transition-all group shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-se-blue/10 flex items-center justify-center
                          group-hover:bg-se-blue/20 transition-colors flex-shrink-0">
            <BookOpen className="w-7 h-7 text-se-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-gray-800">
              <span className="font-accent text-2xl text-se-blue">Sermon</span>{" "}
              <span className="font-accent text-2xl text-gray-800">Explorer</span>
            </h3>
            <p className="text-gray-500 text-sm">Upload and manage sermons</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-se-blue transition-colors" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/admin/worship")}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5
                     flex items-center gap-4 text-left
                     hover:bg-gray-100 hover:border-se-blue/50 transition-all group shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-se-blue/10 flex items-center justify-center
                          group-hover:bg-se-blue/20 transition-colors flex-shrink-0">
            <Music className="w-7 h-7 text-se-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-gray-800">
              <span className="font-accent text-2xl text-se-blue">Worship</span>{" "}
              <span className="font-accent text-2xl text-gray-800">Explorer</span>
            </h3>
            <p className="text-gray-500 text-sm">Upload and manage educational content</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-se-blue transition-colors" />
        </motion.button>
      </div>
    </div>
  );
}
