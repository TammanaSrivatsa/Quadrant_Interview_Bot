import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserX, CheckCircle2, Plus, Trophy, BarChart3, Sparkles } from "lucide-react";
import MetricCard from "../components/MetricCard";
import CandidateTable from "../components/CandidateTable";
import StatusBadge from "../components/StatusBadge";
import { hrApi } from "../services/api";

export default function HRDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [candidatesData, setCandidatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState("");

  const overview = dashboard?.analytics?.overview || {};
  const pipeline = dashboard?.analytics?.pipeline || [];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResponse, rankedResponse] = await Promise.all([
        hrApi.dashboard(),
        hrApi.rankedCandidates({ limit: 5 }),
      ]);
      setDashboard(dashboardResponse);
      setRanked(rankedResponse?.candidates || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setTableLoading(true);
    setError("");
    try {
      const response = await hrApi.listCandidates({ page: 1, sort: "highest_score" });
      setCandidatesData(response);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  async function handleDeleteCandidate(candidate) {
    try {
      await hrApi.deleteCandidate(candidate.uid || candidate.candidate_uid);
      await loadCandidates();
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleScheduleCandidate(candidate) {
    navigate(`/hr/candidates/${candidate.uid || candidate.candidate_uid}`);
  }

  if (loading && !dashboard) return <p className="center muted">Loading HR dashboard...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">HR Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor ATS pipeline metrics, rankings, recommendations, and the latest candidates.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => navigate("/hr/compare")} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Compare Candidates
          </button>
          <button type="button" onClick={() => navigate("/hr/candidates")} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
            <Plus size={20} />
            <span>Manage Candidates</span>
          </button>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Candidates" value={overview.total_candidates || 0} icon={Users} color="blue" />
        <MetricCard title="Shortlisted" value={overview.shortlisted_count || 0} icon={UserCheck} color="green" />
        <MetricCard title="Rejected" value={overview.rejected_count || 0} icon={UserX} color="red" />
        <MetricCard title="Interview Completed" value={overview.completed_interviews || 0} icon={CheckCircle2} color="yellow" />
        <MetricCard title="Avg Score" value={`${Math.round(Number(overview.avg_interview_score || 0))}%`} icon={BarChart3} color="purple" />
        <MetricCard title="Selection Rate" value={`${Math.round(Number(overview.selection_rate || 0))}%`} icon={Sparkles} color="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Top Ranked Candidates</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Final weighted ATS score sorted across current applications.</p>
              </div>
              <button type="button" onClick={() => navigate("/hr/compare")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Open Compare View
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {!ranked.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No ranked candidates yet.</p> : ranked.map((candidate) => (
                <div key={candidate.result_id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">#{candidate.rank || "-"} {candidate.name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{candidate.candidate_uid}</p>
                    </div>
                    <StatusBadge status={candidate.stage || candidate.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"><p className="text-slate-400 text-xs uppercase font-bold">Final Score</p><p className="font-black text-blue-600">{Math.round(Number(candidate.finalAIScore || candidate.score || 0))}%</p></div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"><p className="text-slate-400 text-xs uppercase font-bold">Recommendation</p><p className="font-bold text-slate-900 dark:text-white">{candidate.recommendationTag || "N/A"}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Candidates</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ATS list view preview with ranking and recommendations.</p>
              </div>
            </div>
            {tableLoading ? (
              <p className="center muted py-12">Loading candidates...</p>
            ) : (
              <CandidateTable candidates={candidatesData?.candidates || []} onDeleteCandidate={handleDeleteCandidate} onScheduleCandidate={handleScheduleCandidate} />
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">ATS Pipeline</h4>
            <div className="space-y-4">
              {pipeline.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <div className="flex items-center gap-2"><StatusBadge status={item} /><span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span></div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Recommendation Highlights</h4>
            <div className="space-y-4">
              {(dashboard?.analytics?.top_ranked_candidates || []).length ? dashboard.analytics.top_ranked_candidates.map((item) => (
                <div key={item.result_id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{item.candidate_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.recommendation || "N/A"}</p>
                  <p className="text-xs font-black text-blue-600 mt-2">{Math.round(Number(item.final_score || 0))}%</p>
                </div>
              )) : <p className="text-sm text-slate-500 dark:text-slate-400">No recommendation highlights yet.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Top Skills Found</h4>
            <div className="space-y-3">
              {(dashboard?.analytics?.top_matched_skills || []).length ? dashboard.analytics.top_matched_skills.map((item) => (
                <div key={item.skill} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.skill}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              )) : <p className="text-sm text-slate-500 dark:text-slate-400">No skill trends yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
