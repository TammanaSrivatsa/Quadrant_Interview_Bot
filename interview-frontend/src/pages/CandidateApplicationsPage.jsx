import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { candidateApi } from "../services/api";
import ApplicationStatusBadge, {
  APPLICATION_STATUSES,
} from "../components/candidate/ApplicationStatusBadge";
import ApplicationTimeline from "../components/candidate/ApplicationTimeline";
import ApplicationsEmptyState from "../components/candidate/ApplicationsEmptyState";
import ScheduleInterviewModal from "../components/candidate/ScheduleInterviewModal";
import { normalizeCandidateApplication } from "../utils/candidateJobs";
import { cn } from "../utils/utils";

const PAGE_SIZE = 9;

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApplicationsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);

  // Schedule interview modal
  const [schedulingApp, setSchedulingApp] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.title = "My Applications | InterviewBot";
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    setError("");
    try {
      const response = await candidateApi.applications();
      const rows = Array.isArray(response)
        ? response
        : response?.applications || [];
      setApplications(rows.map(normalizeCandidateApplication));
    } catch (err) {
      setError(err.message || "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications
      .filter((application) => {
        const matchesSearch =
          !query || application.jobTitle.toLowerCase().includes(query);
        const matchesStatus =
          status === "All" || application.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.appliedDate || 0) -
          new Date(a.updatedAt || a.appliedDate || 0)
      );
  }, [applications, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const pagedApplications = filteredApplications.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  async function handleScheduleSubmit(scheduleData) {
    if (!schedulingApp?.resultId) {
      setToast("Unable to schedule interview at the moment. Please refresh and try again.");
      return;
    }
    setScheduling(true);
    setToast("");
    try {
      const response = await candidateApi.scheduleInterview(
        schedulingApp.resultId,
        scheduleData.date,
        scheduleData.time,
      );
      setToast(response.message || `Interview scheduled for ${scheduleData.date} at ${scheduleData.time}.`);
      setSchedulingApp(null);
      await loadApplications();
    } catch (err) {
      setToast(err.message || "Could not schedule interview. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="space-y-5 page-enter">
      {/* ── Search & Filters ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by job title…"
              aria-label="Search applications"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
          >
            <option>All</option>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ArrowDownUp size={15} aria-hidden="true" />
            Latest first
          </div>
        </div>
      </section>

      {/* ── Loading skeleton ── */}
      {loading && <ApplicationsSkeleton />}

      {/* ── Error ── */}
      {!loading && error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-black">Applications could not be loaded.</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && applications.length === 0 && (
        <ApplicationsEmptyState />
      )}

      {/* ── Application Cards ── */}
      {!loading && !error && applications.length > 0 && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedApplications.map((application) => (
              <article
                key={application.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      <BriefcaseBusiness size={20} />
                    </div>
                    <h2 className="line-clamp-2 text-lg font-black leading-snug text-slate-950 dark:text-white">
                      {application.jobTitle}
                    </h2>
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                </div>

                {/* Date grid */}
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <dt className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <CalendarDays size={13} />
                      Applied
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900 dark:text-white">
                      {formatDate(application.appliedDate)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <dt className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <Clock3 size={13} />
                      Updated
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900 dark:text-white">
                      {formatDate(application.updatedAt)}
                    </dd>
                  </div>
                </dl>

                {/* Timeline */}
                <div className="mt-5">
                  <ApplicationTimeline status={application.status} />
                </div>

                {/* Message */}
                {application.message && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    {application.message}
                  </p>
                )}

                {/* Card footer: app-id + buttons */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400 truncate">
                    {application.applicationId}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {application.jobId ? (
                      <Link
                        to={`/candidate/jobs/${application.jobId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        aria-label={`View job details for ${application.jobTitle}`}
                      >
                        <Eye size={15} />
                        View
                      </Link>
                    ) : null}

                    {/* Schedule Interview button */}
                    <button
                      type="button"
                      disabled={application.status !== "Shortlisted"}
                      onClick={() => setSchedulingApp(application)}
                      aria-label={
                        application.status !== "Shortlisted"
                          ? "Available when shortlisted"
                          : `Schedule interview for ${application.jobTitle}`
                      }
                      title={
                        application.status !== "Shortlisted"
                          ? "Interview scheduling is available when you are shortlisted"
                          : "Schedule your interview"
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-black transition",
                        application.status === "Shortlisted"
                          ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-950/50"
                          : "cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-600"
                      )}
                    >
                      <CalendarDays size={15} />
                      Schedule
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {/* Pagination */}
          <footer className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium text-slate-500 dark:text-slate-400">
              Showing {pagedApplications.length} of{" "}
              {filteredApplications.length} applications
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 font-black disabled:opacity-40 dark:border-slate-700"
              >
                Previous
              </button>
              <span className="font-black text-slate-700 dark:text-slate-200">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 font-black disabled:opacity-40 dark:border-slate-700"
              >
                Next
              </button>
            </div>
          </footer>
        </>
      )}

      {/* ── Schedule Interview Modal ── */}
      {schedulingApp && (
        <ScheduleInterviewModal
          application={schedulingApp}
          loading={scheduling}
          onClose={() => setSchedulingApp(null)}
          onSchedule={handleScheduleSubmit}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <CheckCircle2 size={17} className="text-green-500" />
          {toast}
        </div>
      )}
    </div>
  );
}
