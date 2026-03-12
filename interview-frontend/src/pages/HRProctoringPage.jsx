import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Eye, Video, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { hrApi } from "../services/api";

export default function HRProctoringPage() {
  const { sessionId } = useParams();
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTimeline = useCallback(async () => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await hrApi.prorectingTimeline(sessionId);
      setTimeline(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Link to="/hr/interviews" className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={20} />
          <span>Back to Interviews</span>
        </Link>
        <p className="center muted">Loading proctoring timeline...</p>
      </div>
    );
  }

  if (error && !timeline) {
    return (
      <div className="space-y-8">
        <Link to="/hr/interviews" className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={20} />
          <span>Back to Interviews</span>
        </Link>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <p className="alert error">{error}</p>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="space-y-8">
        <Link to="/hr/interviews" className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={20} />
          <span>Back to Interviews</span>
        </Link>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <p className="text-center text-slate-600 dark:text-slate-400">No proctoring data available for this session.</p>
        </div>
      </div>
    );
  }

  const events = timeline?.events || [];
  const suspiciousCount = events.filter((e) => e.flagged).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/hr/interviews" className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={20} />
          <span>Back to Interviews</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-600 to-red-700" />
        <div className="px-8 pb-8">
          <div className="relative -mt-12 flex flex-col md:flex-row md:items-end md:space-x-6">
            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden shadow-lg bg-slate-100">
              <Video size={48} className="w-full h-full p-2 text-slate-400" />
            </div>
            <div className="flex-1 mt-4 md:mt-0">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">Proctoring Session {sessionId}</h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">Interview Monitoring Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Events</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{events.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Events recorded during interview</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 ${suspiciousCount > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${suspiciousCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
            Flagged Events
          </p>
          <p className={`text-3xl font-bold ${suspiciousCount > 0 ? "text-red-900 dark:text-red-300" : "text-slate-900 dark:text-white"}`}>{suspiciousCount}</p>
          <p className={`text-xs mt-2 ${suspiciousCount > 0 ? "text-red-700 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
            Suspicious activity detected
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Session Duration</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{timeline?.duration || "N/A"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Interview runtime</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
          <Eye size={24} className="mr-3" />
          Event Timeline
        </h3>

        {events.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">No events recorded for this session.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={`${index}-${event.timestamp}`}
                className={`p-5 rounded-2xl border ${
                  event.flagged
                    ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-slate-900 dark:text-white">{event.event_type}</p>
                      {event.flagged && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold rounded">
                          Suspicious
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{event.description}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {event.timestamp}
                    </p>
                  </div>
                  {event.confidence && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Confidence</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(event.confidence * 100)}%</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {suspiciousCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-3xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">Suspicious Activity Detected</h3>
              <p className="text-sm text-red-800 dark:text-red-400 mb-4">
                This session has {suspiciousCount} flagged event{suspiciousCount !== 1 ? "s" : ""} that may indicate irregular behavior during the interview.
              </p>
              <ul className="space-y-2 text-sm text-red-800 dark:text-red-400">
                <li className="flex items-start">
                  <div className="w-1 h-1 rounded-full bg-red-600 mt-2 mr-3 flex-shrink-0" />
                  <span>Review the flagged events above for details</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1 h-1 rounded-full bg-red-600 mt-2 mr-3 flex-shrink-0" />
                  <span>Consider contacting the candidate for clarification</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1 h-1 rounded-full bg-red-600 mt-2 mr-3 flex-shrink-0" />
                  <span>Document findings in the interview feedback</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
