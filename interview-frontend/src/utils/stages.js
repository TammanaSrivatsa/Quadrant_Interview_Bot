export const ATS_STAGE_DEFINITIONS = [
  { key: "applied", label: "Applied", tone: "secondary" },
  { key: "screening", label: "Screening", tone: "primary" },
  { key: "shortlisted", label: "Shortlisted", tone: "success" },
  { key: "interview_scheduled", label: "Interview Scheduled", tone: "primary" },
  { key: "interview_completed", label: "Interview Completed", tone: "dark" },
  { key: "selected", label: "Selected", tone: "success" },
  { key: "rejected", label: "Rejected", tone: "danger" },
];

export const ATS_STAGE_KEYS = ATS_STAGE_DEFINITIONS.map((stage) => stage.key);
export const ATS_STAGE_OPTIONS = ATS_STAGE_DEFINITIONS.map((stage) => ({ value: stage.key, label: stage.label }));

const EXTRA_STATUS_DEFINITIONS = [
  { key: "analyzed", label: "Analyzed", tone: "success" },
  { key: "pending", label: "Pending", tone: "secondary" },
  { key: "scheduled", label: "Scheduled", tone: "primary" },
  { key: "completed", label: "Completed", tone: "dark" },
  { key: "not_started", label: "Not Started", tone: "secondary" },
  { key: "in_progress", label: "In Progress", tone: "primary" },
];

const STATUS_MAP = new Map([...ATS_STAGE_DEFINITIONS, ...EXTRA_STATUS_DEFINITIONS].map((item) => [item.key, item]));

export function normalizeStageKey(value, fallback = "applied") {
  const key = String(value || "").trim().toLowerCase();
  return ATS_STAGE_KEYS.includes(key) ? key : fallback;
}

export function toStatusObject(status) {
  if (status && typeof status === "object" && status.label) return status;
  const raw = String(status || "").trim().toLowerCase();
  const mapped = STATUS_MAP.get(raw);
  if (mapped) return mapped;
  return {
    key: raw || "unknown",
    label: raw
      ? raw
          .split(/[_\s-]+/)
          .filter(Boolean)
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(" ")
      : "Unknown",
    tone: "secondary",
  };
}
