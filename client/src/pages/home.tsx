import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Upload, ChevronRight, ShieldCheck, Trash2, Settings } from "lucide-react";
const cdmLogo = "/cdm-logo.webp";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: sermons } = useQuery<any[]>({
    queryKey: ["/api/sermons"],
    queryFn: async () => {
      const res = await fetch("/api/sermons");
      return res.json();
    },
  });

  async function handleDelete(sermonId: string) {
    setDeletingId(sermonId);
    try {
      const res = await fetch(`/api/sermons/${sermonId}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/sermons"] });
      }
    } catch {
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const allSermons = sermons || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img src={cdmLogo} alt="CDM Discipleship Ministries" className="h-[195px] mx-auto mb-1" />
          <h1 className="font-display text-5xl font-extrabold text-gray-800 mb-3">
            <span className="font-accent text-6xl text-se-blue">Sermon</span>{" "}Explorer
          </h1>
          <p className="text-se-green font-display text-lg font-semibold">
            Sunday's Sermon, <span className="font-accent text-xl">Brought to Life</span>
          </p>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
            Interactive illustrated storybooks that transform weekly sermons into
            engaging family experiences for all ages
          </p>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-8">
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

          {allSermons.filter(s => s.status === "ready").length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-display">No sermons available yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-display text-xs font-semibold uppercase tracking-wider">Admin</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-16">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <p className="text-gray-400 text-xs font-display">
            The tools below are available to church administrators for managing sermon content.
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/upload")}
            className="w-full bg-se-blue/10 border border-se-blue/30 rounded-xl p-4
                       flex items-center gap-3
                       hover:bg-se-blue/20 hover:border-se-blue/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-se-blue/15 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-se-blue" />
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-se-blue text-sm block">Upload New Sermon</span>
              <span className="text-gray-400 text-xs">Process a transcript into an interactive storybook</span>
            </div>
          </motion.button>

          <div>
            <div className="flex items-center gap-2 mb-3 pt-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <h3 className="font-display font-bold text-gray-500 text-xs uppercase tracking-wider">Manage Sermons</h3>
            </div>

            {allSermons.length === 0 ? (
              <p className="text-gray-300 text-xs font-display py-3 text-center">No sermons to manage</p>
            ) : (
              <div className="space-y-2">
                {allSermons.map((sermon) => (
                  <div
                    key={sermon.id}
                    className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-gray-700 text-sm truncate">{sermon.title}</p>
                      <p className="text-gray-400 text-xs">
                        {sermon.scripture}
                        {sermon.status === "processing" && " — Processing..."}
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {confirmDeleteId === sermon.id ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 flex-shrink-0"
                        >
                          <button
                            onClick={() => handleDelete(sermon.id)}
                            disabled={deletingId === sermon.id}
                            className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-500 text-xs font-display font-bold
                                       hover:bg-red-100 transition-all disabled:opacity-50"
                          >
                            {deletingId === sermon.id ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs font-display
                                       hover:bg-gray-100 transition-all"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="delete"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setConfirmDeleteId(sermon.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-all group/del flex-shrink-0"
                          title="Delete sermon"
                        >
                          <Trash2 className="w-4 h-4 text-gray-300 group-hover/del:text-red-400 transition-colors" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-gray-300 text-xs pb-6">
        Powered by AI  &middot;  Built for Families  &middot;  PCA CDM
      </p>
    </div>
  );
}
