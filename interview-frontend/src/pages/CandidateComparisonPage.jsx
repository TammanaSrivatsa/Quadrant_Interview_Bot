import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { hrApi } from "../services/api";
import { formatPercent } from "../utils/formatters";
import "./CandidateComparisonPage.css";

function parseIds(searchParams) {
  const raw = searchParams.get("ids") || "";
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 3);
}

export default function CandidateComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedResultIds, setSelectedResultIds] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedResultIds(parseIds(searchParams));
  }, [searchParams]);

  async function loadAllCandidates() {
    setLoading(true);
    setError("");
    try {
      let allResults = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await hrApi.listCandidates({ page, sort: "highest_score" });
        allResults = allResults.concat(response.candidates || []);
        hasMore = response.has_next || false;
        page += 1;
      }

      setAllCandidates(allResults.filter((item) => item.result_id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllCandidates();
  }, []);

  useEffect(() => {
    async function loadCompare() {
      if (selectedResultIds.length < 2) {
        setCompareData([]);
        return;
      }
      setCompareLoading(true);
      setError("");
      try {
        const response = await hrApi.compareCandidates(selectedResultIds);
        setCompareData(response.candidates || []);
      } catch (loadError) {
        setError(loadError.message);
        setCompareData([]);
      } finally {
        setCompareLoading(false);
      }
    }
    loadCompare();
  }, [selectedResultIds]);

  const selectedCandidates = useMemo(
    () => allCandidates.filter((c) => selectedResultIds.includes(c.result_id)),
    [allCandidates, selectedResultIds],
  );

  function syncSelectedIds(ids) {
    setSearchParams(ids.length ? { ids: ids.join(",") } : {});
  }

  function toggleCandidateSelection(candidate) {
    const next = (() => {
      if (selectedResultIds.includes(candidate.result_id)) {
        return selectedResultIds.filter((id) => id !== candidate.result_id);
      }
      if (selectedResultIds.length >= 3) {
        return [...selectedResultIds.slice(1), candidate.result_id];
      }
      return [...selectedResultIds, candidate.result_id];
    })();
    syncSelectedIds(next);
  }

  function clearSelection() {
    syncSelectedIds([]);
  }

  if (loading) return <p className="center muted">Loading candidates for comparison...</p>;

  const invalidSelection = selectedResultIds.length > 0 && selectedResultIds.length < 2;

  return (
    <div className="stack">
      <PageHeader
        title="Candidate Comparison"
        subtitle="Compare 2-3 candidates side-by-side across ATS score, stage, recommendation, skills, and interview summary."
        actions={
          <>
            <Link to="/hr/candidates" className="button-link subtle-button">
              Back to Candidates
            </Link>
            <button type="button" onClick={clearSelection}>
              Clear Selection
            </button>
          </>
        }
      />

      {error && <p className="alert error">{error}</p>}

      {!compareData.length && (
        <section className="card stack">
          <div className="title-row">
            <div>
              <p className="eyebrow">Selection</p>
              <h3>Choose candidates to compare</h3>
            </div>
            <p className="muted">{selectedResultIds.length} selected</p>
          </div>

          {!allCandidates.length && <p className="muted">No candidates available for comparison.</p>}
          {!!allCandidates.length && (
            <div className="candidates-list">
              {allCandidates.map((candidate) => (
                <div key={candidate.result_id} className="candidate-checkbox-row">
                  <input
                    type="checkbox"
                    id={`candidate-${candidate.result_id}`}
                    checked={selectedResultIds.includes(candidate.result_id)}
                    onChange={() => toggleCandidateSelection(candidate)}
                    disabled={!selectedResultIds.includes(candidate.result_id) && selectedResultIds.length >= 3}
                  />
                  <label htmlFor={`candidate-${candidate.result_id}`} className="candidate-label">
                    <span>
                      <strong>{candidate.name}</strong>
                      <span className="muted">{candidate.candidate_uid}</span>
                    </span>
                    <span className="muted">{candidate.email}</span>
                  </label>
                  <StatusBadge status={candidate.stage || candidate.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedResultIds.length === 0 && (
        <section className="card stack">
          <p className="muted">No candidates selected yet. Go back to the candidates page, choose 2-3 candidates, and click Compare.</p>
          <Link to="/hr/candidates" className="button-link subtle-button">Go to Candidates</Link>
        </section>
      )}

      {invalidSelection && (
        <section className="card stack">
          <p className="muted">Select at least 2 candidates to load comparison data.</p>
        </section>
      )}

      {compareLoading && <p className="center muted">Loading comparison data...</p>}

      {compareData.length > 0 && (
        <section className="card stack">
          <div className="title-row">
            <div>
              <p className="eyebrow">Comparison Matrix</p>
              <h3>ATS score breakdown</h3>
            </div>
          </div>

          <div className="comparison-grid">
            {compareData.map((candidate) => (
              <article key={candidate.result_id} className="question-preview-card stack-sm">
                <div className="title-row">
                  <div>
                    <strong>{candidate.candidate?.name || "Candidate"}</strong>
                    <p className="muted">{candidate.candidate?.candidate_uid || "N/A"}</p>
                  </div>
                  <StatusBadge status={candidate.stage} />
                </div>
                <div className="metric-grid compact">
                  <MetricCard label="Final score" value={formatPercent(candidate.final_score ?? candidate.score)} />
                  <MetricCard label="Resume score" value={formatPercent(candidate.score)} />
                  <MetricCard label="Recommendation" value={candidate.recommendation || "N/A"} />
                </div>
                <div className="stack-sm">
                  <p><strong>Resume/JD:</strong> {formatPercent(candidate.score_breakdown?.resume_jd_match_score)}</p>
                  <p><strong>Skills:</strong> {formatPercent(candidate.score_breakdown?.skills_match_score)}</p>
                  <p><strong>Interview:</strong> {formatPercent(candidate.score_breakdown?.interview_performance_score)}</p>
                  <p><strong>Communication:</strong> {formatPercent(candidate.score_breakdown?.communication_behavior_score)}</p>
                  <p><strong>Parsed skills:</strong> {(candidate.parsed_resume?.skills || []).join(", ") || "N/A"}</p>
                  <p><strong>Interview summary:</strong> {(candidate.interview_summary?.strengths_summary || []).join(" ") || candidate.interview_summary?.hiring_recommendation || "N/A"}</p>
                </div>
                <Link to={`/hr/candidates/${candidate.candidate?.candidate_uid}`} className="button-link subtle-button">
                  View Detail
                </Link>
              </article>
            ))}
          </div>

          <div className="comparison-summary">
            <div className="summary-stat">
              <p className="eyebrow">Average Final Score</p>
              <h3>
                {formatPercent(compareData.reduce((sum, c) => sum + (Number(c.final_score ?? c.score) || 0), 0) / compareData.length)}
              </h3>
            </div>
            <div className="summary-stat">
              <p className="eyebrow">Best Candidate</p>
              <h3>{compareData[0]?.candidate?.name || "N/A"}</h3>
            </div>
            <div className="summary-stat">
              <p className="eyebrow">Selections</p>
              <h3>{compareData.filter((c) => c.stage?.key === "selected").length}</h3>
            </div>
          </div>
        </section>
      )}

      {selectedCandidates.length > 0 && compareData.length === 0 && !compareLoading && !error && !invalidSelection && (
        <p className="muted">Unable to load comparison data for the selected candidates.</p>
      )}
    </div>
  );
}
