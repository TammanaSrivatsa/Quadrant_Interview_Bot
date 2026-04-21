export function screeningBandLabel(band) {
  if (band === "strong_shortlist") return "Strong Shortlist";
  if (band === "review_shortlist") return "Review Shortlist";
  if (band === "reject") return "Reject";
  return "Not evaluated";
}

export function formatPercent(value, fallback = "N/A") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return `${Number(value).toFixed(2)}%`;
}

export function formatScoreValue(value, fallback = "0.00") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value).toFixed(2);
}

export function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function resolveInterviewDateTime(source) {
  if (!source) return null;
  const raw =
    source.interview_datetime_utc ||
    source.interview_datetime ||
    source.interview_date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatInterviewDateTimeLocal(source, fallback = "N/A") {
  const date = resolveInterviewDateTime(source);
  if (!date) return fallback;
  return date.toLocaleString();
}

export function toDateTimeLocalInputValue(source) {
  const date = source instanceof Date ? source : resolveInterviewDateTime(source);
  if (!date) return "";
  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toGoogleUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function getGoogleCalendarDateRange(source, durationMinutes = 60) {
  const date = source instanceof Date ? source : resolveInterviewDateTime(source);
  if (!date) return null;
  const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
  return {
    startUtc: toGoogleUtcStamp(date),
    endUtc: toGoogleUtcStamp(endDate),
  };
}

export function titleCase(value) {
  return String(value || "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
