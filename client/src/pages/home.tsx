import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, ShieldCheck } from "lucide-react";
const cdmLogo = "/cdm-logo.webp";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLocation("/admin")}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg
                     hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-600"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="font-display text-xs font-semibold uppercase tracking-wider">Admin</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <img src={cdmLogo} alt="CDM Discipleship Ministries" className="h-[195px] mx-auto mb-1" />
        </motion.div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/sermons")}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-8
                       hover:border-se-green/60 transition-all group shadow-sm text-center"
          >
            <h2 className="font-display text-4xl font-extrabold text-gray-800 mb-2">
              <span className="font-accent text-5xl text-se-blue">Sermon</span>{" "}
              <span className="font-accent text-5xl text-gray-800">Explorer</span>
            </h2>
            <p className="text-se-green font-display text-lg font-semibold mb-3">
              <span className="font-accent text-xl">Sunday's Sermon, Brought to Life</span>
            </p>
            <p className="text-gray-500 text-sm mx-auto">
              Interactive, illustrated storybooks that transform weekly sermons into engageing family experiences for all ages.
            </p>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-8
                       shadow-sm text-center"
          >
            <h2 className="font-display text-4xl font-extrabold text-gray-800 mb-2">
              <span className="font-accent text-5xl text-se-blue">Worship</span>{" "}
              <span className="font-accent text-5xl text-gray-800">Explorer</span>
            </h2>
            <p className="text-se-green font-display text-lg font-semibold mb-3">
              <span className="font-accent text-xl">Corporate Worship, Brought to Life</span>
            </p>
            <p className="text-gray-500 text-sm mx-auto">
              Interactive training to explain and explore the essential elements
              of corporate worship for young people.
            </p>
          </motion.div>
        </div>
      </div>

      <p className="text-center text-gray-300 text-xs pb-6">
        Powered by AI  &middot;  Built for Families  &middot;  PCA CDM
      </p>
    </div>
  );
}
