from __future__ import annotations
import logging
from datetime import datetime
from io import BytesIO
from typing import Any
from fpdf import FPDF
from sqlalchemy.orm import Session
from models import InterviewSession, Candidate, Result, InterviewQuestion, ProctorEvent

logger = logging.getLogger(__name__)

class InterviewReportPDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 15)
        self.cell(0, 10, "AI Interview Platform - Candidate Dossier", border=False, ln=True, align="C")
        self.set_font("helvetica", "I", 10)
        self.cell(0, 10, f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", border=False, ln=True, align="R")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

def generate_interview_pdf(session: InterviewSession, db: Session) -> BytesIO:
    """Generate a professional PDF report for an interview session."""
    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    result = db.query(Result).filter(Result.id == session.result_id).first()
    questions = db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session.id).order_by(InterviewQuestion.id.asc()).all()
    proctor_events = db.query(ProctorEvent).filter(ProctorEvent.session_id == session.id).all()
    
    pdf = InterviewReportPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # 1. Candidate Info
    pdf.set_font("helvetica", "B", 14)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(0, 10, "1. Candidate Information", ln=True, fill=True)
    pdf.set_font("helvetica", "", 11)
    pdf.ln(2)
    pdf.cell(50, 8, f"Name:", border=0)
    pdf.cell(0, 8, f"{candidate.name if candidate else 'N/A'}", border=0, ln=True)
    pdf.cell(50, 8, f"Email:", border=0)
    pdf.cell(0, 8, f"{candidate.email if candidate else 'N/A'}", border=0, ln=True)
    pdf.cell(50, 8, f"Status:", border=0)
    pdf.cell(0, 8, f"{session.status.upper()}", border=0, ln=True)
    pdf.cell(50, 8, f"Final Weighted Score:", border=0)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 8, f"{result.final_score if result and result.final_score is not None else 'N/A'} / 100", border=0, ln=True)
    pdf.ln(5)

    # 2. Executive Summary
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "2. Executive Summary", ln=True, fill=True)
    pdf.set_font("helvetica", "", 10)
    pdf.ln(2)
    
    eval_summary = session.evaluation_summary_json or {}
    pdf.multi_cell(0, 6, f"AI Recommendation: {result.recommendation or 'N/A'}")
    pdf.ln(2)
    pdf.cell(50, 6, "Overall Interview Score:")
    pdf.cell(0, 6, f"{eval_summary.get('overall_interview_score', 'N/A')}", ln=True)
    pdf.cell(50, 6, "Communication Score:")
    pdf.cell(0, 6, f"{eval_summary.get('communication_score', 'N/A')}", ln=True)
    pdf.cell(50, 6, "Technical Depth:")
    pdf.cell(0, 6, f"{eval_summary.get('technical_depth_score', 'N/A')}", ln=True)
    pdf.ln(5)

    # 3. Interview Transcript
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "3. Interview Transcript", ln=True, fill=True)
    pdf.ln(2)
    
    for i, q in enumerate(questions, 1):
        # Question Header
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(50, 50, 150)
        pdf.multi_cell(0, 6, f"Q{i} [{q.question_type.upper()}]: {q.text}")
        pdf.set_text_color(0, 0, 0)
        
        # Answer
        pdf.set_font("helvetica", "I", 10)
        ans_text = q.answer_text if q.answer_text else "(No answer provided or skipped)"
        if q.skipped:
            ans_text = "(Skipped)"
        pdf.multi_cell(0, 6, f"Candidate Answer: {ans_text}")
        
        # AI Feedback
        if q.llm_feedback:
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(0, 5, f"AI Feedback: {q.llm_feedback}")
            pdf.set_text_color(0, 0, 0)
            
        pdf.ln(4)
        if pdf.get_y() > 250:
            pdf.add_page()

    # 4. Proctoring & Compliance
    if pdf.get_y() > 200:
        pdf.add_page()
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "4. Proctoring & Compliance", ln=True, fill=True)
    pdf.set_font("helvetica", "", 10)
    pdf.ln(2)
    
    suspicious_events = [e for e in proctor_events if e.event_type in {"no_face", "multi_face", "face_mismatch", "tab_switch", "paste_detected"}]
    pdf.cell(60, 6, f"Total Warnings Issued:")
    pdf.cell(0, 6, f"{session.warning_count}", ln=True)
    pdf.cell(60, 6, f"Suspicious Events Detected:")
    pdf.cell(0, 6, f"{len(suspicious_events)}", ln=True)
    
    if suspicious_events:
        pdf.ln(2)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(40, 6, "Timestamp", border=1)
        pdf.cell(60, 6, "Event Type", border=1)
        pdf.cell(0, 6, "Details", border=1, ln=True)
        pdf.set_font("helvetica", "", 8)
        for e in suspicious_events[:15]:  # Limit to 15 in PDF
            pdf.cell(40, 6, f"{e.created_at.strftime('%H:%M:%S')}", border=1)
            pdf.cell(60, 6, f"{e.event_type}", border=1)
            detail = (e.meta_json or {}).get("detail", "N/A")
            pdf.cell(0, 6, f"{str(detail)[:60]}", border=1, ln=True)
    
    # Save to buffer
    output = BytesIO()
    pdf_bytes = pdf.output()
    output.write(pdf_bytes)
    output.seek(0)
    return output
