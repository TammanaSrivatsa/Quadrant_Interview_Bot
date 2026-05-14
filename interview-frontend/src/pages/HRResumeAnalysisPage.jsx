import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Link2,
  Search,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
  X,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MetricCard from "../components/MetricCard";
import { backendAssetUrl, baseURL, hrApi } from "../services/api";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/utils";

const ACCEPTED_TYPES = [".pdf", ".doc", ".docx"];

function scoreTone(score) {
  if (score >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50";
  if (score >= 45) return "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50";
  return "text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50";
}

function ScoreRing({ score, label }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const circumference = 2 * Math.PI * 34;
  const dash = (value / 100) * circumference;
  const stroke = value >= 75 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-800" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 dark:text-white">{Math.round(value)}%</div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">AI resume fit score</p>
      </div>
    </div>
  );
}

function SkillPills({ items, tone = "blue", empty = "No skills detected" }) {
  const colors = tone === "green"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
    : tone === "red"
      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
      : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  if (!items?.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 12).map((item) => (
        <span key={item} className={cn("rounded-full px-2.5 py-1 text-xs font-bold capitalize", colors)}>{item}</span>
      ))}
    </div>
  );
}

function SkillComparisonCard({ title, items, tone, icon: Icon, empty }) {
  const palette = tone === "green"
    ? {
        wrap: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-900/10",
        text: "text-emerald-700 dark:text-emerald-400",
        pill: "bg-white text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-400 dark:ring-emerald-900/50",
      }
    : {
        wrap: "border-red-100 bg-red-50/70 dark:border-red-900/50 dark:bg-red-900/10",
        text: "text-red-700 dark:text-red-400",
        pill: "bg-white text-red-700 ring-1 ring-red-200 dark:bg-slate-900 dark:text-red-400 dark:ring-red-900/50",
      };

  return (
    <div className={cn("rounded-2xl border p-5", palette.wrap)}>
      <div className={cn("mb-3 flex items-center gap-2 text-sm font-black", palette.text)}>
        <Icon size={18} />
        <span>{title} ({items?.length || 0})</span>
      </div>
      {items?.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize", palette.pill)}>
              <Icon size={13} />
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}

function DetailModal({ candidate, onClose, selectedJd }) {
  if (!candidate) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {(candidate.name || "C").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{candidate.name}</h2>
              <p className="text-sm text-slate-500">{candidate.email || "No email"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="grid gap-4 md:grid-cols-2">
            <SkillComparisonCard
              title="Matched Skills"
              items={candidate.matched_skills}
              tone="green"
              icon={CheckCircle2}
              empty="No matched skills detected yet."
            />
            <SkillComparisonCard
              title="Unmatched Skills"
              items={candidate.missing_skills}
              tone="red"
              icon={XCircle}
              empty="No missing skills detected."
            />
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-50 px-6 py-4 text-sm dark:bg-slate-800/30">
          <p className="text-slate-600 dark:text-slate-300">
            JD: <span className="font-black text-slate-900 dark:text-white">{selectedJd?.title || "Selected JD"}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Match Score: <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{Math.round(candidate.score || 0)}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HRResumeAnalysisPage() {
  const toast = useToast();
  const inputRef = useRef(null);
  const [jds, setJds] = useState([]);
  const [selectedJdId, setSelectedJdId] = useState("");
  const [ranking, setRanking] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [minScore, setMinScore] = useState("");
  const [detail, setDetail] = useState(null);

  const selectedJd = useMemo(() => jds.find((jd) => String(jd.id) === String(selectedJdId)), [jds, selectedJdId]);

  const loadJds = useCallback(async () => {
    const response = await hrApi.listJds();
    const rows = Array.isArray(response) ? response : response?.jds || response?.jobs || [];
    setJds(rows);
    setSelectedJdId((current) => current || (rows[0]?.id ? String(rows[0].id) : ""));
  }, []);

  const loadRanking = useCallback(async () => {
    if (!selectedJdId) {
      setRanking([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await hrApi.resumeAnalysisCandidates(selectedJdId, {
        search: search.trim() || undefined,
        sort,
        min_score: minScore === "" ? undefined : Number(minScore),
      });
      setRanking(response.candidates || []);
      setSummary(response.summary || null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [minScore, search, selectedJdId, sort, toast]);

  useEffect(() => {
    loadJds().catch((error) => {
      setLoading(false);
      toast.error(error.message);
    });
  }, [loadJds, toast]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  function validateFiles(files) {
    const accepted = [];
    const rejected = [];
    Array.from(files || []).forEach((file) => {
      const ext = `.${file.name.split(".").pop()}`.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) rejected.push(`${file.name} is not a supported resume type.`);
      else if (file.size > 10_000_000) rejected.push(`${file.name} exceeds 10MB.`);
      else accepted.push(file);
    });
    rejected.forEach((message) => toast.warning(message));
    return accepted;
  }

  function addFiles(files) {
    const accepted = validateFiles(files);
    setSelectedFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}-${file.size}`));
      return [...current, ...accepted.filter((file) => !keys.has(`${file.name}-${file.size}`))];
    });
  }

  async function uploadSelectedFiles() {
    if (!selectedJdId) {
      toast.warning("Select or save a JD before uploading resumes.");
      return;
    }
    if (!selectedFiles.length) {
      toast.warning("Choose at least one resume to analyze.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const response = await hrApi.uploadResumeAnalysis(selectedJdId, selectedFiles, (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded * 100) / event.total));
      });
      if (response.errors?.length) response.errors.forEach((item) => toast.warning(`${item.file}: ${item.error}`));
      toast.success(`${response.uploaded?.length || 0} resume(s) analyzed.`);
      setSelectedFiles([]);
      await loadRanking();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function openDetail(candidate) {
    try {
      const response = await hrApi.resumeAnalysisDetail(candidate.candidate_uid, selectedJdId);
      setDetail(response.candidate || candidate);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function generateCandidateLink(candidate) {
    const link = new URL(`/hr/candidates/${candidate.candidate_uid}`, window.location.origin).toString();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("input");
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      toast.success("Candidate link copied to clipboard.");
    } catch (error) {
      toast.error("Unable to copy candidate link.");
    }
  }

  const topCandidate = summary?.top_candidates?.[0];
  const average = Math.round(summary?.average_score || 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 page-enter md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
            <Sparkles size={13} /> AI Powered
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-display dark:text-white">Resume Analysis</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Upload resumes, match them to a JD, rank candidates, and inspect parsed AI insights.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <BriefcaseBusiness size={18} className="text-slate-400" />
          <select value={selectedJdId} onChange={(e) => setSelectedJdId(e.target.value)} className="min-w-0 bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white">
            {jds.length ? jds.map((jd) => <option key={jd.id} value={String(jd.id)}>{jd.title}</option>) : <option value="">No JDs available</option>}
          </select>
          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Resumes Uploaded" value={summary?.total_resumes || 0} icon={FileText} color="blue" />
        <MetricCard title="Average Score" value={`${average}%`} icon={Target} color="purple" />
        <MetricCard title="Top Match" value={topCandidate ? `${Math.round(topCandidate.score)}%` : "0%"} hint={topCandidate?.name || "No candidates yet"} icon={CheckCircle2} color="green" />
        <MetricCard title="Skills Tracked" value={summary?.skills_distribution?.length || 0} icon={Users} color="yellow" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="self-start rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Created Job Descriptions</h2>
              <p className="text-sm text-slate-500">Select one of the JDs already created by the HR team to run resume matching.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{jds.length} JDs</span>
          </div>
          {jds.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {jds.map((jd) => {
                const isSelected = String(jd.id) === String(selectedJdId);
                const skills = Object.keys(jd.weights_json || {});
                return (
                  <button
                    key={jd.id}
                    type="button"
                    onClick={() => setSelectedJdId(String(jd.id))}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-blue-200 bg-blue-50/70 ring-2 ring-blue-100 dark:border-blue-900/60 dark:bg-blue-950/20 dark:ring-blue-900/40"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900 dark:text-white">{jd.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {jd.experience_requirement > 0 ? `${jd.experience_requirement}+ yrs` : "Any experience"} | {jd.qualify_score}% qualify
                        </p>
                      </div>
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-black",
                        isSelected
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                      )}>
                        {isSelected ? "Selected" : jd.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700">
                          {skill}
                        </span>
                      ))}
                      {skills.length > 6 && (
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                          +{skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
              No JDs have been created yet. Create one in JD Management to start resume analysis.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Resume Upload</h2>
          <p className="text-sm text-slate-500">PDF, DOC, and DOCX. Multiple files supported.</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800/40"
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <UploadCloud className="mb-3 h-11 w-11 rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200 dark:shadow-blue-950/30" />
            <p className="font-black text-slate-900 dark:text-white">Drop resumes here or click to browse</p>
            <button onClick={() => inputRef.current?.click()} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Choose files</button>
          </div>
          {uploading && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>Uploading and analyzing</span><span>{uploadProgress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}
          {selectedFiles.length ? (
            <div className="mt-4 space-y-2">
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <button onClick={() => setSelectedFiles((rows) => rows.filter((row) => row !== file))} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ) : null}
          <button onClick={uploadSelectedFiles} disabled={uploading || !selectedFiles.length} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
            {uploading ? "Analyzing resumes..." : "Run AI Match"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Skills Distribution" data={summary?.skills_distribution || []} kind="bar" />
        <ChartCard title="Experience Distribution" data={summary?.experience_distribution || []} kind="bar" color="#10b981" />
        <ChartCard title="Score Distribution" data={summary?.score_distribution || []} kind="area" color="#7c3aed" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Resume Ranking</h2>
            <p className="text-sm text-slate-500">Sorted by JD fit with filters for score, experience, skills, and education.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates or skills..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-64" />
            </div>
            <input value={minScore} onChange={(e) => setMinScore(e.target.value)} type="number" min="0" max="100" placeholder="Min score" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-28" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="score">Match score</option>
              <option value="experience">Experience</option>
              <option value="skills">Skills</option>
              <option value="education">Education</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                {["Rank", "Candidate", "Contact", "Matched", "Score", "Recommendation", "Actions"].map((head) => (
                  <th key={head} className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Loading resume analysis...</td></tr>
              ) : ranking.length ? ranking.map((candidate) => (
                <tr key={candidate.candidate_uid || candidate.result_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">#{candidate.rank}</span></td>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900 dark:text-white">{candidate.name}</p>
                    <p className="text-xs text-slate-500">{candidate.resume_filename}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                    <p>{candidate.email}</p><p>{candidate.phone || "No phone detected"}</p>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">{candidate.matched_skills?.length || 0} / {candidate.total_required_skills || 0} skills</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, candidate.score || 0)}%` }} /></div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-black", scoreTone(candidate.score))}>{Math.round(candidate.score)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", scoreTone(candidate.score))}>{candidate.recommendation}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <a href={`${baseURL}/hr/resume/${candidate.candidate_uid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download size={14} />Resume</a>
                      <button onClick={() => openDetail(candidate)} className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"><Eye size={14} />View</button>
                      <button onClick={() => generateCandidateLink(candidate)} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-600">
                        <Link2 size={14} />Generate
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">No analyzed resumes yet. Upload resumes to start ranking candidates.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DetailModal candidate={detail} onClose={() => setDetail(null)} selectedJd={selectedJd} />
    </div>
  );
}

function ChartCard({ title, data, kind, color = "#2563eb" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 font-black text-slate-900 dark:text-white">{title}</h3>
      <div className="h-56">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "area" ? (
              <AreaChart data={data}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.16} strokeWidth={3} />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-800/50">No chart data yet</div>
        )}
      </div>
    </div>
  );
}
