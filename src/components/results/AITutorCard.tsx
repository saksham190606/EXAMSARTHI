"use client";

import { useState, useEffect } from 'react';
import ReviewWalkthrough from './ReviewWalkthrough';

interface AITutorCardProps {
  results: { score: number; totalQuestions: number };
  correctTopics?: string;
  weakTopics?: string;
  startReviewWalkthrough?: () => void;
  reviewQuestions?: any[];
}

export default function AITutorCard({ results, correctTopics, weakTopics, startReviewWalkthrough, reviewQuestions }: AITutorCardProps) {
  const [summary, setSummary] = useState("Exam complete. Review your answers.");
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  useEffect(() => {
    const handleLocalCommand = (e: any) => {
      const { target } = e.detail || {};
      if (target === 'REVIEW') {
        setIsWalkthroughActive(true);
      } else if (target === 'STOP') {
        setIsWalkthroughActive(false);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
    };
    window.addEventListener('ai_voice_command', handleLocalCommand);
    return () => window.removeEventListener('ai_voice_command', handleLocalCommand);
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/tutor-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: results?.score ?? 0,
            total: results?.totalQuestions ?? 0,
            correctTopics: correctTopics || "Reasoning and Aptitude",
            weakTopics: weakTopics || "General Knowledge"
          })
        });
        console.log("[FRONTEND DIAGNOSTIC] Received response from backend. Status:", res.status);
        const data = await res.json();
        console.log("[FRONTEND DIAGNOSTIC] Final summary data received by UI:", data.summary);
        
        let text = data?.summary || "Exam complete. Review your answers.";
        if (text === "Unauthorized") {
          text = "Exam complete. Review your answers.";
        }
        text = text
          .replace(/say\s+['"]?review['"]?\s+to\s+review\s+your\s+answers\.?/gi, 'Review your answers.')
          .replace(/say\s+['"]?review['"]?\s+to\s+begin\s+reviewing\s+your\s+questions(\s+one\s+by\s+one)?\.?/gi, 'Review your answers.')
          .replace(/when\s+you\s+are\s+ready,\s+say\s+['"]?review['"]?\s+to\s+begin\s+reviewing/gi, 'Review')
          .replace(/say\s+['"]?review['"]?/gi, 'Review your answers');
        setSummary(text.trim());
      } catch (err) {
        setSummary("Exam complete. Review your answers.");
      }
    };
    if (results) fetchSummary();
  }, [results, correctTopics, weakTopics]);

  const handleStartWalkthrough = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsWalkthroughActive(true);
    if (typeof startReviewWalkthrough === 'function') {
      startReviewWalkthrough();
    }
  };

  if (isWalkthroughActive) {
    const rawList = (reviewQuestions && reviewQuestions.length > 0) ? reviewQuestions : [];
    const formattedQuestions = rawList.map((q: any, idx: number) => {
      const qText = q.questionText || q.text || `Question ${idx + 1}`;
      const qUser = q.userAnswer || 'Not Answered';
      const qCorrect = q.correctAnswer || 'Verified standard answer';
      const qExp = q.explanation || 'No explanation provided.';

      return {
        ...q,
        questionText: qText,
        text: qText,
        userAnswer: qUser,
        correctAnswer: qCorrect,
        explanation: qExp,
      };
    });

    return (
      <ReviewWalkthrough 
        onClose={() => setIsWalkthroughActive(false)}
        results={{ questions: formattedQuestions }} 
      />
    );
  }

  return (
    <div className="bg-neutral-900 border border-[#ffed00]/40 rounded-xl p-6 mb-8 shadow-[0_0_15px_rgba(255,237,0,0.1)]">
      <h2 className="text-xl font-bold text-[#ffed00] mb-2 flex items-center gap-2">
        ✨ AI Performance Tutor
      </h2>
      <p className="text-neutral-300 text-lg leading-relaxed mb-6">
        &ldquo;{summary}&rdquo;
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button 
          id="btn-start-review-walkthrough"
          onClick={handleStartWalkthrough}
          className="px-6 py-3 bg-[#ffed00] hover:bg-[#ffe100] text-black font-extrabold rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          📖 Start Review Walkthrough
        </button>
      </div>
    </div>
  );
}
