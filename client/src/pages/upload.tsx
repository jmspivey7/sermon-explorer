import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [sermonId, setSermonId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("sermon", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Upload failed");

      setSermonId(data.sermonId);
      setStatus("processing");

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/sermons/${data.sermonId}/status`);
          const statusData = await statusRes.json();
          setProgress(statusData.progress || 0);
          setCurrentStep(statusData.currentStep || "");

          if (statusData.status === "ready") {
            clearInterval(pollInterval);
            setStatus("done");
          } else if (statusData.status === "error") {
            clearInterval(pollInterval);
            setStatus("error");
            setError("Processing failed. Please try again.");
          }
        } catch {
          // Continue polling
        }
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-se-navy to-[#1e3454]">
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-display font-bold text-white text-lg">Upload Sermon</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-8">
        {status === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/30 rounded-3xl p-12
                         flex flex-col items-center justify-center cursor-pointer
                         hover:border-se-teal/60 hover:bg-white/5 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <>
                  <FileText className="w-12 h-12 text-se-teal mb-3" />
                  <p className="font-display font-bold text-white text-lg">{file.name}</p>
                  <p className="text-white/50 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-white/40 mb-3" />
                  <p className="font-display font-bold text-white/70">Drop your sermon here</p>
                  <p className="text-white/40 text-sm mt-1">Word (.docx), PDF, or text file</p>
                </>
              )}
            </div>

            {file && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpload}
                className="w-full mt-6 child-button bg-se-teal text-se-navy"
              >
                Process Sermon
              </motion.button>
            )}

            <div className="mt-8 bg-white/5 rounded-2xl p-5">
              <h3 className="font-display font-bold text-white text-sm mb-3">What happens next?</h3>
              <div className="space-y-3 text-sm text-white/60">
                <div className="flex gap-3">
                  <span className="text-se-teal font-bold">1.</span>
                  <p>AI reads and analyzes the sermon transcript</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-teal font-bold">2.</span>
                  <p>Breaks it into illustrated scenes with age-appropriate narratives</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-teal font-bold">3.</span>
                  <p>Generates original artwork, quizzes, and discussion prompts</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-teal font-bold">4.</span>
                  <p>Assembles the complete interactive storybook experience</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(status === "uploading" || status === "processing") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#2AADAD" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.83} 283`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-display font-bold text-xl">{progress}%</span>
              </div>
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">
              {status === "uploading" ? "Uploading..." : "Processing Sermon"}
            </h2>
            <p className="text-se-teal text-sm font-display">{currentStep || "Starting..."}</p>
            <p className="text-white/30 text-xs mt-4">This may take several minutes</p>
          </motion.div>
        )}

        {status === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-12">
            <CheckCircle className="w-16 h-16 text-se-teal mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">Ready!</h2>
            <p className="text-white/60 text-sm mb-6">Your sermon storybook is ready to explore.</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation(`/view/${sermonId}`)}
              className="child-button bg-se-teal text-se-navy"
            >
              Open Storybook
            </motion.button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-12">
            <AlertCircle className="w-16 h-16 text-se-coral mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-white/60 text-sm mb-6">{error}</p>
            <button onClick={() => { setStatus("idle"); setFile(null); }} className="child-button bg-white/10 text-white">
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
