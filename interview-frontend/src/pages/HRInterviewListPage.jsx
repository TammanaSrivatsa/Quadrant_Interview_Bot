import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { hrApi } from "../services/api";
import { formatDateTime } from "../utils/formatters";

function SuspiciousEventsBadge({ count }) {
  if (count === 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold"><CheckCircle2 size={14} />Clean</span>;
  if (count <= 2) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold"><AlertTriangle size={14} />{count} flag</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold"><AlertTriangle size={14} />{count} flags</span>;
}

export default function HRInterviewListPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await hrApi.interviews();
        setData(response.interviews || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((row) => {
      const candidateName = row.candidate?.name || "";
      const candidateEmail = row.candidate?.email || "";
      const jobTitle = row.job?.title || "";
      const applicationId = row.application_id || "";
      return [candidateName, candidateEmail, jobTitle, applicationId, row.status || ""]
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [data, search]);

  const suspiciousTotal = filteredRows.reduce((sum, row) => sum + Number(row.suspicious_events_count || 0), 0);
  const completedCount = filteredRows.filter((row) => row.status === "completed" || row.status === "selected" || row.status === "rejected").length;

  if (loading) return <p className="center muted">Loading interviews...</p>;

  return (
    <div className="stack page-enter">
      <PageHeader
        title="Interview Reviews"
        subtitle="Review completed sessions, suspicious events, and finalize outcomes."
        actions={
          <Link to="/hr" className="button-link subtle-button">
            Back to HR Dashboard
          </Link>
        }
      />

      {error && <p className="alert error">{error}</p>}

      <section className="metric-grid page-enter-delay-1">
        <MetricCard label="Interviews" value={String(filteredRows.length)} hint="Current filtered sessions" />
        <MetricCard label="Completed" value={String(completedCount)} hint="Ready for final decision" />
        <MetricCard label="Suspicious events" value={String(suspiciousTotal)} hint="Across visible sessions" />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Search by candidate, email, job, application ID, or status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Filter interviews by name, email, job, or application ID"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium dark:text-white"
            />
          </div>
        </div>

        {!filteredRows.length && (
          <div className="p-12 text-center">
            <Clock size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No interviews found matching your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        )}

        {!!filteredRows.length && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Application</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Started</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Events</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Flags</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredRows.map((row) => (
                  <tr key={row.interview_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">{row.application_id || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{row.candidate?.name || "Unnamed"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.candidate?.email || "No email"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{row.job?.title || "Not assigned"}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {formatDateTime(row.started_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">{row.events_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <SuspiciousEventsBadge count={row.suspicious_events_count ?? 0} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/hr/interviews/${row.interview_id}`}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                        aria-label={`Review interview for ${row.candidate?.name || 'candidate'}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
