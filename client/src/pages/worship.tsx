import { useLocation } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function Worship() {
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
        <div>
          <h1 className="font-display font-bold text-gray-800 text-lg">
            <span className="font-accent text-2xl text-se-blue">Worship</span>{" "}
            <span className="font-accent text-2xl text-gray-800">Explorer</span>
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="text-center py-8">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-display">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
