import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { GitCompareArrows, RefreshCw } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import ScoreBadge from "../components/ScoreBadge";
import { hrApi } from "../services/api";

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "interview_completed", label: "Interview Completed" },
  { key: "selected", label: "Selected" },
  { key: "rejected", label: "Rejected" },
];

function CandidateCard({ candidate, isDragging = false, listeners = {}, attributes = {}, setNodeRef }) {
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`pipeline-card ${isDragging ? "pipeline-card-dragging" : ""}`}>
      <div className="pipeline-card-header">
        <div>
          <h4>{candidate?.name || "Unnamed candidate"}</h4>
          <p>{candidate?.candidate_uid || "No ID"}</p>
        </div>
        <StatusBadge status={candidate?.finalDecision} />
      </div>
      <div className="pipeline-card-body">
        <div className="pipeline-card-metrics">
          <div>
            <span>Final Score</span>
            <ScoreBadge score={candidate?.finalAIScore || 0} />
          </div>
          <div>
            <span>Match %</span>
            <strong>{candidate?.matchPercent || 0}%</strong>
          </div>
        </div>
        <p><strong>Recommendation:</strong> {candidate?.recommendationTag || "N/A"}</p>
        <p><strong>Assigned JD:</strong> {candidate?.assignedJd?.title || candidate?.role || "Not assigned"}</p>
      </div>
      <div className="pipeline-card-footer">
        <Link to={`/hr/candidates/${candidate?.candidate_uid}`} className="button-link subtle-button">Open</Link>
      </div>
    </div>
  );
}

function DraggableCandidateCard({ candidate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `candidate-${candidate.result_id}`,
    data: { candidate },
  });

  return <CandidateCard candidate={candidate} setNodeRef={setNodeRef} listeners={listeners} attributes={attributes} isDragging={isDragging} />;
}

function PipelineColumn({ stage, candidates }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key, data: { stageKey: stage.key } });

  return (
    <section ref={setNodeRef} className={`pipeline-column ${isOver ? "pipeline-column-over" : ""}`}>
      <div className="pipeline-column-header">
        <div>
          <p className="eyebrow">Stage</p>
          <h3>{stage.label}</h3>
        </div>
        <span className="pipeline-column-count">{candidates.length}</span>
      </div>
      <div className="pipeline-column-body">
        {candidates.length ? candidates.map((candidate) => <DraggableCandidateCard key={candidate.result_id} candidate={candidate} />) : <p className="muted">No candidates in this stage</p>}
      </div>
    </section>
  );
}

export default function HRPipelinePage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [updatingResultId, setUpdatingResultId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function loadCandidates() {
    setLoading(true);
    setError("");
    try {
      let page = 1;
      let hasMore = true;
      let allCandidates = [];
      while (hasMore) {
        const response = await hrApi.listCandidates({ page, sort: "highest_score" });
        allCandidates = allCandidates.concat(response?.candidates || []);
        hasMore = Boolean(response?.has_next);
        page += 1;
      }
      setCandidates(Array.isArray(allCandidates) ? allCandidates.filter((item) => item?.result_id) : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load pipeline.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  const groupedCandidates = useMemo(() => {
    const groups = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage.key, []]));
    for (const candidate of candidates) {
      const stageKey = candidate?.interviewStatus?.key || "applied";
      if (!groups[stageKey]) groups[stageKey] = [];
      groups[stageKey].push(candidate);
    }
    return groups;
  }, [candidates]);

  const totalCandidates = candidates.length;

  async function handleDragEnd(event) {
    const droppedStage = event?.over?.id;
    const draggedCandidate = event?.active?.data?.current?.candidate;
    setActiveCandidate(null);

    if (!draggedCandidate?.result_id || !droppedStage) return;
    const currentStage = draggedCandidate?.interviewStatus?.key || "applied";
    if (currentStage === droppedStage) return;

    const previousCandidates = candidates;
    setCandidates((current) => current.map((item) => item.result_id === draggedCandidate.result_id ? {
      ...item,
      interviewStatus: { ...(item.interviewStatus || {}), key: droppedStage, label: PIPELINE_STAGES.find((stage) => stage.key === droppedStage)?.label || droppedStage },
    } : item));

    setUpdatingResultId(draggedCandidate.result_id);
    setError("");
    try {
      await hrApi.updateCandidateStage(draggedCandidate.result_id, { stage: droppedStage, note: `Updated from HR pipeline to ${droppedStage}.` });
      await loadCandidates();
    } catch (updateError) {
      setCandidates(previousCandidates);
      setError(updateError.message || "Failed to update candidate stage.");
    } finally {
      setUpdatingResultId(null);
    }
  }

  if (loading) return <p className="center muted">Loading HR pipeline...</p>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">HR Pipeline</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Drag candidates between ATS stages and manage the recruiting pipeline visually.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/hr/candidates" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><GitCompareArrows size={18} /><span>Candidate List</span></Link>
          <button type="button" onClick={loadCandidates} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-200 dark:shadow-none"><RefreshCw size={18} /><span>Refresh</span></button>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {updatingResultId ? <p className="muted text-sm">Updating stage for result #{updatingResultId}...</p> : null}

      {!totalCandidates ? (
        <section className="card stack empty-state-card">
          <p className="eyebrow">Pipeline</p>
          <h3>No candidates available</h3>
          <p className="muted">Candidates will appear here once applications are available.</p>
        </section>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event) => setActiveCandidate(event?.active?.data?.current?.candidate || null)}
          onDragCancel={() => setActiveCandidate(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="pipeline-board-scroll">
            <div className="pipeline-board">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineColumn key={stage.key} stage={stage} candidates={groupedCandidates[stage.key] || []} />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeCandidate ? <CandidateCard candidate={activeCandidate} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
