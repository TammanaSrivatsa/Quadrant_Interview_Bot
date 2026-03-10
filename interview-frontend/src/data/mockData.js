export const mockCandidates = [
  {
    id: "CAN-001",
    uid: "user-001",
    name: "Alex Johnson",
    email: "alex.j@example.com",
    role: "Full Stack Developer",
    resumeStatus: "Analyzed",
    resumeScore: 85,
    interviewStatus: "Scheduled",
    finalDecision: "Pending",
    appliedDate: "2023-10-25",
    experience: "5 years",
    skills: ["React", "Node.js", "Python", "AWS", "SQL"],
    missingSkills: ["Docker", "Kubernetes"],
    strengths: ["Strong problem solving", "Excellent communication", "Solid architecture knowledge"],
    weaknesses: ["Limited DevOps experience", "New to Golang"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  {
    id: "CAN-002",
    uid: "user-002",
    name: "Sarah Williams",
    email: "sarah.w@example.com",
    role: "Frontend Engineer",
    resumeStatus: "Analyzed",
    resumeScore: 92,
    interviewStatus: "Completed",
    finalDecision: "Shortlisted",
    appliedDate: "2023-10-24",
    experience: "3 years",
    skills: ["React", "TypeScript", "Tailwind CSS", "Figma"],
    missingSkills: ["Unit Testing"],
    strengths: ["UI/UX focused", "Fast learner", "Great attention to detail"],
    weaknesses: ["Needs improvement in backend concepts"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "CAN-003",
    uid: "user-003",
    name: "Michael Chen",
    email: "m.chen@example.com",
    role: "Backend Developer",
    resumeStatus: "Analyzed",
    resumeScore: 78,
    interviewStatus: "Completed",
    finalDecision: "Rejected",
    appliedDate: "2023-10-23",
    experience: "4 years",
    skills: ["Python", "Django", "PostgreSQL", "Redis"],
    missingSkills: ["React", "Vue.js"],
    strengths: ["Efficient database queries", "Good documentation"],
    weaknesses: ["Lacks frontend knowledge", "Struggled with system design"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
  },
  {
    id: "CAN-004",
    uid: "user-004",
    name: "Emily Davis",
    email: "emily.d@example.com",
    role: "Product Manager",
    resumeStatus: "Pending",
    resumeScore: 0,
    interviewStatus: "Not Started",
    finalDecision: "Pending",
    appliedDate: "2023-10-26",
    experience: "6 years",
    skills: ["Agile", "Scrum", "Product Vision", "Data Analysis"],
    missingSkills: ["SQL"],
    strengths: ["Visionary", "Great stakeholder management"],
    weaknesses: ["Needs more technical depth"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
  }
];

export const mockStats = {
  totalCandidates: 124,
  shortlisted: 45,
  rejected: 32,
  interviewsScheduled: 18,
  interviewsCompleted: 29
};

export const mockInterviewResults = [
  {
    id: "INT-001",
    candidateId: "CAN-002",
    overallScore: 88,
    technicalScore: 92,
    communicationScore: 85,
    confidenceScore: 88,
    recommendation: "Strong Hire",
    questions: [
      {
        question: "Explain the difference between useMemo and useCallback.",
        score: 95,
        transcript: "useMemo is for memoizing values, while useCallback is for memoizing functions to prevent unnecessary re-renders in child components...",
        feedback: "Correct and detailed explanation."
      },
      {
        question: "How do you handle state management in large React apps?",
        score: 85,
        transcript: "I usually start with Context API for simple things, and move to Redux or Zustand if it gets complex...",
        feedback: "Good understanding of trade-offs."
      }
    ]
  }
];
