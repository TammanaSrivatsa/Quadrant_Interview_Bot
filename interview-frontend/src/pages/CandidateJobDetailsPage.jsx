import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, FileText, MapPin, Send } from "lucide-react";
import { candidateApi } from "../services/api";
import ApplicationStatusBadge from "../components/candidate/ApplicationStatusBadge";
import ResumeUploadPanel from "../components/candidate/ResumeUploadPanel";
import JobsDashboardSkeleton from "../components/candidate/JobsDashboardSkeleton";
import { fileNameFromPath, normalizeCandidateApplication, normalizeJob } from "../utils/candidateJobs";
import { useAnnounce } from "../hooks/useAccessibility";

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

function BulletList({ items }) {
  const rows = (items || []).filter(Boolean);
  if (!rows.length) return <p>Details will be shared by the recruiter.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <CheckCircle2 size={16} className="mt-1 flex-shrink-0 text-green-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CandidateJobDetailsPage() {
  const { jobId } = useParams();
  const location = useLocation();
  const { announce } = useAnnounce();
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(location.state?.needsResume ? "Upload your resume to apply." : "");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadPage() {
    setLoading(true);
    setError("");
    try {
      const [dashboardResponse, applicationsResponse] = await Promise.all([
        candidateApi.dashboard(),
        candidateApi.applications(),
      ]);
      const jobRows = dashboardResponse?.available_jds || dashboardResponse?.available_jobs || [];
      const normalizedJobs = jobRows.map(normalizeJob);
      setDashboard(dashboardResponse);
      setJobs(normalizedJobs);
      setApplications((applicationsResponse?.applications || []).map(normalizeCandidateApplication));
      const currentJob = normalizedJobs.find((item) => String(item.id) === String(jobId));
      document.title = `${currentJob?.title || "Job Details"} | InterviewBot`;
    } catch (err) {
      setError(err.message || "Could not load job details.");
    } finally {
      setLoading(false);
    }
  }

  const job = useMemo(() => jobs.find((item) => String(item.id) === String(jobId)), [jobs, jobId]);
  const application = useMemo(() => applications.find((item) => String(item.jobId) === String(jobId)), [applications, jobId]);
  const similarJobs = useMemo(() => jobs.filter((item) => String(item.id) !== String(jobId)).slice(0, 3), [jobs, jobId]);
  const hasResume = Boolean(dashboard?.candidate?.resume_path);
  const resumeName = fileNameFromPath(dashboard?.candidate?.resume_path);

  async function refreshApplications() {
    const response = await candidateApi.applications();
    setApplications((response?.applications || []).map(normalizeCandidateApplication));
  }

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const response = await candidateApi.uploadResumeOnly(file);
      setDashboard((current) => ({ ...(current || {}), candidate: response?.candidate || current?.candidate }));
      setToast("Resume uploaded.");
      announce("Resume uploaded successfully");
    } catch (err) {
      setError(err.message || "Resume upload failed.");
      announce(`Error: ${err.message}`, "assertive");
    } finally {
      setUploading(false);
    }
  }

  async function handleApply() {
    if (!job) return;
    if (!hasResume) {
      setToast("Upload your resume first.");
      return;
    }
    setApplying(true);
    setError("");
    try {
      await candidateApi.selectJd(job.id);
      await refreshApplications();
      setToast("Application submitted.");
      announce(`Application submitted for ${job.title}`);
    } catch (err) {
      setError(err.message || "Could not submit application.");
      announce(`Error: ${err.message}`, "assertive");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <JobsDashboardSkeleton />;

  if (!job) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <BriefcaseBusiness className="mx-auto text-slate-400" size={34} />
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Job not found</h1>
        <Link to="/candidate/jobs" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Back to All Jobs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <Link to="/candidate/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600 dark:text-slate-400">
      <ArrowLeft size={16} />
        Back to All Jobs
      </Link>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-display">{job.title}</h1>
            {job.companyName && (
              <p className="mt-1.5 text-base font-semibold text-slate-600 dark:text-slate-400">{job.companyName}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><MapPin size={16} />{job.location}</span>
              <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={16} />{job.jobType}</span>
              <span>{job.experienceLevel}</span>
              {job.salary && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  {job.salary}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5"><Clock3 size={16} />{job.postedTime}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || Boolean(application)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              <Send size={17} />
              {application ? "Applied" : applying ? "Applying..." : "Apply Now"}
            </button>
            <button
              type="button"
              onClick={() => setSaved((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black transition ${saved ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}
            >
              <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save Job"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <main className="space-y-5">
          <DetailSection title="About Role">
            <p className="whitespace-pre-wrap">{job.description}</p>
          </DetailSection>
          <DetailSection title="Responsibilities">
            <BulletList items={job.responsibilities} />
          </DetailSection>
          <DetailSection title="Requirements">
            <BulletList items={job.requirements} />
          </DetailSection>
          <DetailSection title="Skills">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{skill}</span>
              ))}
            </div>
          </DetailSection>
          <DetailSection title="Benefits">
            <BulletList items={job.benefits} />
          </DetailSection>
        </main>

        <aside className="space-y-5">
          <ResumeUploadPanel hasResume={hasResume} resumeName={resumeName} uploading={uploading} onUpload={handleResumeUpload} compact />
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Application Status</h2>
            <div className="mt-4">
              {application ? <ApplicationStatusBadge status={application.status} /> : <span className="text-sm font-medium text-slate-500">Not applied yet</span>}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick Apply</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {hasResume ? "Your resume is ready. Apply when this role looks right." : "Upload your resume once and it will attach to your application."}
            </p>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || Boolean(application)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              <Send size={17} />
              {application ? "Applied" : applying ? "Applying..." : "Apply"}
            </button>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Similar Jobs</h2>
            <div className="mt-4 space-y-3">
              {similarJobs.map((item) => (
                <Link key={item.id} to={`/candidate/jobs/${item.id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.location} · {item.jobType}</p>
                </Link>
              ))}
              {!similarJobs.length && <p className="text-sm text-slate-500">No similar jobs available.</p>}
            </div>
          </section>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <FileText size={18} className="text-blue-500" />
          {toast}
        </div>
      )}
    </div>
  );
}
