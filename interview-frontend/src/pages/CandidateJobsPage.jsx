import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Search,
  UploadCloud,
} from "lucide-react";
import { candidateApi } from "../services/api";
import ApplyJobModal from "../components/candidate/ApplyJobModal";
import JobCard from "../components/candidate/JobCard";
import JobsDashboardSkeleton from "../components/candidate/JobsDashboardSkeleton";
import { useAnnounce } from "../hooks/useAccessibility";
import {
  fileNameFromPath,
  normalizeCandidateApplication,
  normalizeJob,
} from "../utils/candidateJobs";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

export default function CandidateJobsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState(() => new Set());

  // Filters
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterJobType, setFilterJobType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Apply modal
  const [modalJob, setModalJob] = useState(null);

  const navigate = useNavigate();
  const { announce } = useAnnounce();

  useEffect(() => {
    document.title = "All Jobs | InterviewBot";
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");
    try {
      const [dashboardResponse, applicationsResponse] = await Promise.all([
        candidateApi.dashboard(),
        candidateApi.applications(),
      ]);
      const jobRows =
        dashboardResponse?.available_jds ||
        dashboardResponse?.available_jobs ||
        [];
      setDashboard(dashboardResponse);
      setJobs(jobRows.map(normalizeJob));
      setApplications(
        (applicationsResponse?.applications || []).map(normalizeCandidateApplication)
      );
    } catch (err) {
      setError(err.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }

  const hasResume = Boolean(dashboard?.candidate?.resume_path);
  const resumeName = fileNameFromPath(dashboard?.candidate?.resume_path);
  const applicationsByJob = useMemo(
    () => new Map(applications.map((item) => [item.jobId, item])),
    [applications]
  );

  // Derive unique filter options from job data
  const uniqueLocations = useMemo(
    () => [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort(),
    [jobs]
  );
  const uniqueJobTypes = useMemo(
    () => [...new Set(jobs.map((j) => j.jobType).filter(Boolean))].sort(),
    [jobs]
  );

  const visibleJobs = useMemo(() => {
    const query = searchKeyword.trim().toLowerCase();
    return jobs
      .filter((job) => {
        const matchesKeyword =
          !query ||
          `${job.title} ${job.skills.join(" ")} ${job.shortDescription} ${job.location}`
            .toLowerCase()
            .includes(query);
        const matchesType = !filterJobType || job.jobType === filterJobType;
        const matchesLocation =
          !filterLocation || job.location === filterLocation;
        return matchesKeyword && matchesType && matchesLocation;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [jobs, searchKeyword, filterJobType, filterLocation]);

  async function refreshApplications() {
    const response = await candidateApi.applications();
    setApplications(
      (response?.applications || []).map(normalizeCandidateApplication)
    );
  }

  async function uploadResume(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const response = await candidateApi.uploadResumeOnly(file);
      setDashboard((current) => ({
        ...(current || {}),
        candidate: response?.candidate || current?.candidate,
      }));
      setToast("Resume uploaded and ready.");
      announce("Resume uploaded successfully");
    } catch (err) {
      setError(err.message || "Resume upload failed.");
      announce(`Error: ${err.message}`, "assertive");
    } finally {
      setUploading(false);
    }
  }

  function handleResumeChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) uploadResume(file);
  }

  async function applyToJob(job) {
    setApplying(true);
    setError("");
    try {
      await candidateApi.selectJd(job.id);
      await refreshApplications();
      setToast(`Applied to ${job.title}.`);
      announce(`Application submitted for ${job.title}`);
    } catch (err) {
      setError(err.message || "Could not submit application.");
      announce(`Error: ${err.message}`, "assertive");
    } finally {
      setApplying(false);
    }
  }

  function handleJobApplyClick(job) {
    if (applicationsByJob.has(job.id)) return; // already applied
    setModalJob(job);
  }

  async function handleModalApplyExisting() {
    if (!modalJob) return;
    const job = modalJob;
    setModalJob(null);
    if (!hasResume) {
      navigate(`/candidate/jobs/${job.id}`, { state: { needsResume: true } });
      return;
    }
    await applyToJob(job);
  }

  async function handleModalApplyNew(file) {
    if (!modalJob) return;
    const job = modalJob;
    await uploadResume(file);
    setModalJob(null);
    await applyToJob(job);
  }

  function toggleSaved(jobId) {
    setSavedJobs((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  if (loading) return <JobsDashboardSkeleton />;

  const hasActiveFilters = searchKeyword || filterJobType || filterLocation;

  return (
    <div className="space-y-5 page-enter">
      {/* ── Header: All Jobs Banner + 2 Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          {/* Background decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 right-16 h-28 w-28 rounded-full bg-white/5"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                <Briefcase size={12} />
                Candidate Portal
              </div>
              <h1 className="text-3xl font-black tracking-tight">All Jobs</h1>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-blue-100">
                Discover the right opportunity, apply with confidence, and track
                every step of your journey.
              </p>
            </div>

            {/* Resume action */}
            <div className="flex-shrink-0">
              {hasResume ? (
                <label
                  className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                  title={resumeName || "Resume uploaded"}
                  aria-label="Resume uploaded — click to replace"
                >
                  <CheckCircle2 size={16} />
                  Resume Ready
                  <span className="hidden text-xs font-normal opacity-70 group-hover:inline">
                    · Replace
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleResumeChange}
                  />
                </label>
              ) : (
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
                  aria-label="Upload resume to start applying"
                >
                  <UploadCloud
                    size={16}
                    className={uploading ? "animate-pulse" : ""}
                  />
                  {uploading ? "Uploading…" : "Upload Resume"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleResumeChange}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Total Jobs Card */}
        <StatCard
          value={jobs.length}
          label="Total Jobs"
          accent="text-slate-950 dark:text-white"
        />

        {/* Applied Jobs Card */}
        <StatCard
          value={applications.length}
          label="Applied"
          accent="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle size={18} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
          {/* Keyword search */}
          <label className="relative block" aria-label="Search by keyword or job title">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
              aria-hidden="true"
            />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by keyword or job title…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-950"
            />
          </label>

          {/* Job Type */}
          <div className="relative">
            <Briefcase
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
              aria-hidden="true"
            />
            <select
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
              aria-label="Filter by job type"
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
            >
              <option value="">All Job Types</option>
              {(uniqueJobTypes.length ? uniqueJobTypes : JOB_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
              aria-hidden="true"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
              aria-hidden="true"
            />
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              aria-label="Filter by location"
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Active filter indicators */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Active:</span>
            {searchKeyword && (
              <FilterChip label={`"${searchKeyword}"`} onRemove={() => setSearchKeyword("")} />
            )}
            {filterJobType && (
              <FilterChip label={filterJobType} onRemove={() => setFilterJobType("")} />
            )}
            {filterLocation && (
              <FilterChip label={filterLocation} onRemove={() => setFilterLocation("")} />
            )}
            <button
              type="button"
              onClick={() => { setSearchKeyword(""); setFilterJobType(""); setFilterLocation(""); }}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* ── Jobs List ── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            {visibleJobs.length}{" "}
            <span className="font-semibold text-slate-500">
              job{visibleJobs.length !== 1 ? "s" : ""} found
            </span>
          </h2>
        </div>

        {visibleJobs.length > 0 ? (
          <div className="space-y-3">
            {visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                applied={applicationsByJob.has(job.id)}
                saved={savedJobs.has(job.id)}
                onSave={() => toggleSaved(job.id)}
                onView={() => navigate(`/candidate/jobs/${job.id}`)}
                onApply={() => handleJobApplyClick(job)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Briefcase className="text-slate-400" size={26} />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              No jobs found
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? "Try adjusting your filters or search term."
                : "No jobs are available at the moment. Check back soon."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearchKeyword(""); setFilterJobType(""); setFilterLocation(""); }}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Apply Modal ── */}
      {modalJob && (
        <ApplyJobModal
          job={modalJob}
          hasResume={hasResume}
          resumeName={resumeName}
          loading={applying || uploading}
          onClose={() => setModalJob(null)}
          onApplyExisting={handleModalApplyExisting}
          onApplyNew={handleModalApplyNew}
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

      <div aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ value, label, accent }) {
  return (
    <div className="flex min-w-[120px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md hover:-translate-y-0.5">
      <span className={`text-4xl font-black leading-none ${accent}`}>
        {value}
      </span>
      <span className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full transition hover:text-blue-900"
      >
        ×
      </button>
    </span>
  );
}
