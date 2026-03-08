import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, Film } from "lucide-react";

type VideoModel = "sora-2" | "sora-2-pro";

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
  const [videoModel, setVideoModel] = useState<VideoModel>("sora-2");

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
      formData.append("videoModel", videoModel);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Upload failed");

      setSermonId(data.sermonId);
      setStatus("processing");

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
    <div className="min-h-screen bg-white">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => setLocation("/")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-display font-bold text-gray-800 text-lg">Upload Sermon</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-8">
        {status === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-3xl p-12
                         flex flex-col items-center justify-center cursor-pointer
                         hover:border-se-blue/60 hover:bg-se-blue/5 transition-all"
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
                  <FileText className="w-12 h-12 text-se-blue mb-3" />
                  <p className="font-display font-bold text-gray-800 text-lg">{file.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-display font-bold text-gray-600">Drop your sermon here</p>
                  <p className="text-gray-400 text-sm mt-1">Word (.docx), PDF, or text file</p>
                </>
              )}
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-4 h-4 text-se-blue" />
                    <h3 className="font-display font-bold text-gray-800 text-sm">Video Quality</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setVideoModel("sora-2")}
                      className={`rounded-xl p-3 text-left transition-all border ${
                        videoModel === "sora-2"
                          ? "bg-se-blue/10 border-se-blue/60 text-gray-800"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-display font-bold text-sm">Standard</p>
                      <p className="text-xs mt-0.5 opacity-70">Sora 2 — Fast</p>
                    </button>
                    <button
                      onClick={() => setVideoModel("sora-2-pro")}
                      className={`rounded-xl p-3 text-left transition-all border ${
                        videoModel === "sora-2-pro"
                          ? "bg-se-green/10 border-se-green/60 text-gray-800"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-display font-bold text-sm">Pro</p>
                      <p className="text-xs mt-0.5 opacity-70">Sora 2 Pro — Best</p>
                    </button>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  className="w-full mt-4 child-button bg-se-blue text-white"
                >
                  Process Sermon
                </motion.button>
              </motion.div>
            )}

            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="font-display font-bold text-gray-800 text-sm mb-3">What happens next?</h3>
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex gap-3">
                  <span className="text-se-blue font-bold">1.</span>
                  <p>AI reads and analyzes the sermon transcript</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-blue font-bold">2.</span>
                  <p>Breaks it into illustrated scenes with age-appropriate narratives</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-blue font-bold">3.</span>
                  <p>Generates original artwork, quizzes, and discussion prompts</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-se-blue font-bold">4.</span>
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
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#1d88a9" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.83} 283`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-800 font-display font-bold text-xl">{Math.round(progress)}%</span>
              </div>
            </div>
            <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
              {status === "uploading" ? "Uploading..." : "Creating Your Storybook"}
            </h2>
            <p className="text-se-blue text-sm font-display">{currentStep || "Starting..."}</p>
            <p className="text-gray-400 text-xs mt-4 max-w-xs mx-auto">
              {progress > 70
                ? "Generating animated video scenes. This step takes several minutes — please keep this page open."
                : "This may take several minutes"}
            </p>
          </motion.div>
        )}

        {status === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-12">
            <CheckCircle className="w-16 h-16 text-se-green mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Ready!</h2>
            <p className="text-gray-500 text-sm mb-6">Your sermon storybook is ready to explore.</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation(`/view/${sermonId}`)}
              className="child-button bg-se-blue text-white"
            >
              Open Storybook
            </motion.button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-12">
            <AlertCircle className="w-16 h-16 text-se-purple mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button onClick={() => { setStatus("idle"); setFile(null); }} className="child-button bg-gray-100 text-gray-700">
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
