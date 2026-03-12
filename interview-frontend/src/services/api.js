import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

function buildAvatar(name) {
  const seed = String(name || "user").trim() || "user";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function extractErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join(", ");
  }
  return error?.message || "Request failed";
}

async function request(config) {
  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

function toStatusObject(status) {
  if (status && typeof status === "object" && status.label) {
    return status;
  }

  const raw = String(status || "").trim().toLowerCase();
  const map = {
    analyzed: { key: "analyzed", label: "Analyzed", tone: "success" },
    pending: { key: "pending", label: "Pending", tone: "secondary" },
    scheduled: { key: "scheduled", label: "Scheduled", tone: "primary" },
    completed: { key: "completed", label: "Completed", tone: "dark" },
    shortlisted: { key: "shortlisted", label: "Shortlisted", tone: "success" },
    rejected: { key: "rejected", label: "Rejected", tone: "danger" },
    interview_scheduled: { key: "interview_scheduled", label: "Interview Scheduled", tone: "primary" },
    applied: { key: "applied", label: "Applied", tone: "secondary" },
    selected: { key: "selected", label: "Selected", tone: "success" },
    not_started: { key: "not_started", label: "Not Started", tone: "secondary" },
    in_progress: { key: "in_progress", label: "In Progress", tone: "primary" },
  };

  return map[raw] || {
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

function deriveDecision({ status, shortlisted, sessionStatus, finalScore }) {
  const normalizedStatus = toStatusObject(status);
  const sessionKey = String(sessionStatus || "").trim().toLowerCase();

  if (sessionKey === "selected") {
    return { key: "selected", label: "Selected", tone: "success" };
  }
  if (sessionKey === "rejected") {
    return { key: "rejected", label: "Rejected", tone: "danger" };
  }
  if (normalizedStatus.key === "rejected") {
    return { key: "rejected", label: "Rejected", tone: "danger" };
  }
  if (shortlisted || normalizedStatus.key === "shortlisted" || normalizedStatus.key === "interview_scheduled") {
    return { key: "shortlisted", label: "Shortlisted", tone: "success" };
  }
  if (normalizedStatus.key === "completed" && typeof finalScore === "number" && finalScore >= 75) {
    return { key: "selected", label: "Selected", tone: "success" };
  }
  return { key: "pending", label: "Pending", tone: "secondary" };
}

function normalizeCandidateSummary(item) {
  const status = toStatusObject(item?.status);
  const decision = deriveDecision({
    status,
    shortlisted: false,
    sessionStatus: status.key,
    finalScore: item?.score,
  });

  return {
    ...item,
    uid: item?.candidate_uid,
    candidate_uid: item?.candidate_uid,
    display_id: item?.candidate_uid || (item?.id ? `CAN-${item.id}` : "Candidate"),
    avatar: buildAvatar(item?.name),
    role: item?.job?.title || "Candidate",
    jobTitle: item?.job?.title || "Candidate",
    resumeScore: Number(item?.score || 0),
    score: Number(item?.score || 0),
    interviewStatus: status,
    status,
    finalDecision: decision,
    appliedDate: item?.created_at,
    interviewDate: item?.interview_date || null,
  };
}

function normalizeApplication(application) {
  const explanation = application?.explanation || {};
  const interviewScoring = explanation?.interview_scoring || {};
  const status = toStatusObject(application?.status);
  const decision = deriveDecision({
    status,
    shortlisted: application?.shortlisted,
    sessionStatus: application?.latest_session?.status,
    finalScore: interviewScoring?.final_score,
  });

  return {
    ...application,
    explanation,
    status,
    finalDecision: decision,
    resumeScore:
      typeof explanation?.final_resume_score === "number"
        ? explanation.final_resume_score
        : typeof application?.score === "number"
          ? application.score
          : 0,
    semanticScore:
      typeof explanation?.semantic_score === "number" ? explanation.semantic_score : 0,
    skillMatchScore:
      typeof explanation?.matched_percentage === "number"
        ? explanation.matched_percentage
        : typeof explanation?.weighted_skill_score === "number"
          ? explanation.weighted_skill_score
          : 0,
    interviewScore:
      typeof interviewScoring?.technical_score === "number"
        ? interviewScoring.technical_score
        : null,
    behavioralScore:
      typeof explanation?.hr_behavioral_score === "number"
        ? explanation.hr_behavioral_score
        : null,
    communicationScore:
      typeof explanation?.hr_communication_score === "number"
        ? explanation.hr_communication_score
        : null,
    finalAIScore:
      typeof interviewScoring?.final_score === "number"
        ? interviewScoring.final_score
        : typeof application?.score === "number"
          ? application.score
          : 0,
  };
}

function normalizeCandidateDetail(data) {
  const applications = (data?.applications || []).map(normalizeApplication);
  const latestApplication = applications[0] || null;
  const candidate = data?.candidate || {};
  const skillGap = data?.skill_gap || null;
  const resumeAdvice = data?.resume_advice || null;

  return {
    ...data,
    candidate: {
      ...candidate,
      uid: candidate?.candidate_uid,
      avatar: buildAvatar(candidate?.name),
      role: latestApplication?.job?.title || "Candidate",
      current_status: toStatusObject(candidate?.current_status || latestApplication?.status),
      finalDecision: latestApplication?.finalDecision || deriveDecision({ status: candidate?.current_status }),
      resumeScore: latestApplication?.resumeScore ?? 0,
      semanticScore: latestApplication?.semanticScore ?? 0,
      skillMatchScore: latestApplication?.skillMatchScore ?? 0,
      interviewScore: latestApplication?.interviewScore ?? null,
      behavioralScore: latestApplication?.behavioralScore ?? null,
      communicationScore: latestApplication?.communicationScore ?? null,
      finalAIScore: latestApplication?.finalAIScore ?? 0,
      matchedSkills: skillGap?.matched_skills || latestApplication?.explanation?.matched_skills || [],
      missingSkills: skillGap?.missing_skills || latestApplication?.explanation?.missing_skills || [],
      strengths: resumeAdvice?.strengths || [],
      rewriteTips: resumeAdvice?.rewrite_tips || [],
      nextSteps: resumeAdvice?.next_steps || [],
    },
    applications,
    resume_advice: resumeAdvice,
    skill_gap: skillGap,
  };
}

export const authApi = {
  login(payload) {
    return request({
      method: "post",
      url: "/auth/login",
      data: {
        email: payload.email,
        password: payload.password,
      },
    });
  },

  signup(payload) {
    return request({
      method: "post",
      url: "/auth/signup",
      data: payload,
    });
  },

  logout() {
    return request({
      method: "post",
      url: "/auth/logout",
    });
  },

  me() {
    return request({
      method: "get",
      url: "/auth/me",
    });
  },
};

export const candidateApi = {
  dashboard(jobId) {
    return request({
      method: "get",
      url: "/candidate/dashboard",
      params: jobId ? { job_id: jobId } : undefined,
    });
  },

  jds() {
    return request({
      method: "get",
      url: "/candidate/jds",
    });
  },

  selectJd(jdId) {
    return request({
      method: "post",
      url: "/candidate/select-jd",
      data: { jd_id: jdId },
    });
  },

  skillMatch(jobId) {
    return request({
      method: "get",
      url: `/candidate/skill-match/${jobId}`,
    });
  },

  uploadResume(file, jobId) {
    const formData = new FormData();
    formData.append("resume", file);
    if (jobId) {
      formData.append("job_id", String(jobId));
    }

    return request({
      method: "post",
      url: "/candidate/upload-resume",
      data: formData,
    });
  },

  scheduleInterview(resultId, interviewDate) {
    return request({
      method: "post",
      url: "/candidate/select-interview-date",
      data: {
        result_id: resultId,
        interview_date: interviewDate,
      },
    });
  },

  practiceKit(jobId) {
    return request({
      method: "get",
      url: "/candidate/practice-kit",
      params: jobId ? { job_id: jobId } : undefined,
    });
  },
};

export const hrApi = {
  dashboard(jobId) {
    return request({
      method: "get",
      url: "/hr/dashboard",
      params: jobId ? { job_id: jobId } : undefined,
    });
  },

  listJds() {
    return request({
      method: "get",
      url: "/hr/jds",
    });
  },

  getJd(jdId) {
    return request({
      method: "get",
      url: `/hr/jds/${jdId}`,
    });
  },

  createJd(payload) {
    return request({
      method: "post",
      url: "/hr/jds",
      data: payload,
    });
  },

  updateJd(jdId, payload) {
    return request({
      method: "put",
      url: `/hr/jds/${jdId}`,
      data: payload,
    });
  },

  async listCandidates(params = {}) {
    const response = await request({
      method: "get",
      url: "/hr/candidates",
      params,
    });
    return {
      ...response,
      candidates: (response?.candidates || []).map(normalizeCandidateSummary),
    };
  },

  async candidateDetail(candidateUid) {
    const response = await request({
      method: "get",
      url: `/hr/candidates/${candidateUid}`,
    });
    return normalizeCandidateDetail(response);
  },

  skillGap(candidateUid, jobId) {
    return request({
      method: "get",
      url: `/hr/candidates/${candidateUid}/skill-gap`,
      params: jobId ? { job_id: jobId } : undefined,
    });
  },

  deleteCandidate(candidateUid) {
    return request({
      method: "post",
      url: `/hr/candidates/${candidateUid}/delete`,
    });
  },

  generateQuestions(candidateId) {
    return request({
      method: "post",
      url: `/hr/candidate/${candidateId}/generate-questions`,
    });
  },

  interviews() {
    return request({
      method: "get",
      url: "/hr/interviews",
    });
  },

  interviewDetail(interviewId) {
    return request({
      method: "get",
      url: `/hr/interviews/${interviewId}`,
    });
  },

  finalizeInterview(interviewId, payload) {
    return request({
      method: "post",
      url: `/hr/interviews/${interviewId}/finalize`,
      data: payload,
    });
  },

  interviewScore(payload) {
    return request({
      method: "post",
      url: "/hr/interview-score",
      data: payload,
    });
  },

  uploadJd(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request({
      method: "post",
      url: "/hr/upload-jd",
      data: formData,
    });
  },

  confirmJd(payload) {
    return request({
      method: "post",
      url: "/hr/confirm-jd",
      data: payload,
    });
  },

  updateSkillWeights(payload) {
    return request({
      method: "post",
      url: "/hr/update-skill-weights",
      data: payload,
    });
  },

  localBackup() {
    return request({
      method: "get",
      url: "/hr/local-backup",
    });
  },

  prorectingTimeline(sessionId) {
    return request({
      method: "get",
      url: `/hr/proctoring/${sessionId}`,
    });
  },
};

export const proctorApi = {
  uploadFrame(sessionId, frameData) {
    const formData = new FormData();
    formData.append("frame", frameData);
    return request({
      method: "post",
      url: "/proctor/frame",
      data: formData,
      params: { session_id: sessionId },
    });
  },
};

export const interviewApi = {
  start(payload) {
    return request({
      method: "post",
      url: "/interview/start",
      data: payload,
    });
  },

  submitAnswer(payload) {
    return request({
      method: "post",
      url: "/interview/answer",
      data: payload,
    });
  },

  transcribe(formData) {
    return request({
      method: "post",
      url: "/interview/transcribe",
      data: formData,
    });
  },
};
