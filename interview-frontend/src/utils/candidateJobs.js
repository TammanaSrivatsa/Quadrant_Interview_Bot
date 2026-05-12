import { APPLICATION_STATUSES } from "../components/candidate/ApplicationStatusBadge";

export const JOB_CATEGORIES = [
  { key: "recommended", label: "Recommended Jobs" },
  { key: "recent", label: "Recently Added Jobs" },
  { key: "trending", label: "Trending Jobs" },
  { key: "remote", label: "Remote Jobs" },
  { key: "internship", label: "Internship Opportunities" },
];

export function formatPostedTime(value) {
  if (!value) return "Recently posted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently posted";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}

export function fileNameFromPath(path) {
  if (!path) return "";
  return String(path).split(/[\\/]/).pop() || "Uploaded resume";
}

export function normalizeJob(item, index = 0) {
  const skills = Array.isArray(item?.skills)
    ? item.skills
    : Object.keys(item?.weights_json || item?.skill_scores || {}).slice(0, 8);
  const title = item?.title || item?.jd_title || "Untitled Role";
  const text = item?.jd_text || item?.description || "";
  const lower = `${title} ${item?.job_type || ""} ${item?.location || ""}`.toLowerCase();
  return {
    id: item.id,
    title,
    companyName: item?.company_name || "",
    location: item?.location || "Remote / Hybrid",
    jobType: item?.job_type || "Full-time",
    salary: item?.salary || "",
    experienceLevel: item?.experience_level || (Number(item?.experience_requirement || 0) > 0 ? `${item.experience_requirement}+ years` : "Entry level"),
    shortDescription: item?.short_description || text.slice(0, 220) || "Explore this opportunity and apply with your uploaded resume.",
    description: text || "Full job description will be shared by the recruiter.",
    responsibilities: item?.responsibilities || [],
    requirements: item?.requirements || [item?.education_requirement, Number(item?.experience_requirement || 0) > 0 ? `${item.experience_requirement}+ years experience` : ""].filter(Boolean),
    benefits: item?.benefits || [],
    skills: skills.length ? skills : ["Communication", "Problem Solving"],
    postedTime: formatPostedTime(item?.created_at),
    createdAt: item?.created_at || null,
    isRecommended: index < 4,
    isRemote: lower.includes("remote"),
    isInternship: lower.includes("intern") || lower.includes("trainee"),
    isTrending: index % 3 === 0 || Number(item?.total_questions || 0) >= 8,
  };
}

export function normalizeCandidateApplication(item) {
  return {
    id: item?.id || item?.applicationId || `APP-${item?.resultId || item?.jobId || item?.jd_id || "NA"}`,
    jobId: item?.jobId || item?.jd_id,
    resultId: item?.resultId || item?.result_id || null,
    jobTitle: item?.jobTitle || item?.jd_title || "Untitled Role",
    appliedDate: item?.appliedDate || item?.applied_at || null,
    applicationId: item?.applicationId || item?.id || "Not assigned",
    status: APPLICATION_STATUSES.includes(item?.status) ? item.status : "Applied",
    message: item?.message || "",
    updatedAt: item?.updatedAt || item?.lastUpdated || item?.appliedDate || item?.applied_at || null,
    timeline: item?.timeline || [],
  };
}
