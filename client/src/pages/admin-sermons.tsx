import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Settings, Trash2 } from "lucide-react";

export default function AdminSermons() {
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
      <div className="px-4 py-3 flex items-center gap-3 sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <button
          onClick={() => setLocation("/admin")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-display font-bold text-gray-800 text-lg">
            <span className="font-accent text-2xl text-se-blue">Sermon</span>{" "}
            <span className="font-accent text-2xl text-gray-800">Explorer</span>
            <span className="text-gray-400 text-sm ml-2">Admin</span>
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/upload")}
          className="w-full bg-se-blue/10 border border-se-blue/30 rounded-2xl p-5
                     flex items-center gap-4
                     hover:bg-se-blue/20 hover:border-se-blue/50 transition-all mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-se-blue/15 flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-se-blue" />
          </div>
          <div className="text-left">
            <span className="font-display font-bold text-se-blue text-base block">Upload New Sermon</span>
            <span className="text-gray-400 text-sm">Process a transcript into an interactive storybook</span>
          </div>
        </motion.button>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-gray-400" />
            <h2 className="font-display font-bold text-gray-400 text-sm uppercase tracking-wider">Manage Sermons</h2>
          </div>

          {allSermons.length === 0 ? (
            <p className="text-gray-300 text-sm font-display py-6 text-center">No sermons to manage</p>
          ) : (
            <div className="space-y-2">
              {allSermons.map((sermon) => (
                <div
                  key={sermon.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3"
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
  );
}
