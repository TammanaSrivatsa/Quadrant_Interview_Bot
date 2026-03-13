import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, BarChart3, ArrowRight } from "lucide-react";

export default function Completed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto relative z-10 shadow-xl shadow-emerald-100 dark:shadow-none">
            <CheckCircle2 size={48} />
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center font-black">
            OK
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display leading-tight">
            Interview Submitted
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Your interview session is complete. The recruitment team can now review your transcript,
            answers, and proctoring timeline.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            What happens next?
          </h3>
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                1
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Interview Submitted
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your final answers are saved and the session is closed.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                2
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">HR Review</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recruiters review your interview answers and final notes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                3
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Final Outcome
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check your application status page for screening status, interview review, and the
                  final decision when available.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate("/candidate")}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Home size={20} />
            <span>Go to Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/interview/result")}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all group"
          >
            <BarChart3 size={20} />
            <span>View Application Status</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
