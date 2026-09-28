"use client";

import { useState, useEffect } from 'react';
import { speakText } from '@/lib/voice/useVoiceEngine';

interface AITutorCardProps {
  results: { score: number; totalQuestions: number };
  startReviewWalkthrough: () => void;
}

export default function AITutorCard({ results, startReviewWalkthrough }: AITutorCardProps) {
  const [summary, setSummary] = useState("Analyzing your performance...");
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/tutor-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: results.score,
            total: results.totalQuestions,
            correctTopics: "Reasoning and Aptitude",
            weakTopics: "General Knowledge"
          })
        });
        const data = await res.json();
        setSummary(data.summary);
      } catch (err) {
        setSummary("Analysis complete. You may now review your answers.");
      }
    };
    if (results) fetchSummary();
  }, [results]);

  const handlePlaySummary = () => {
    setIsSpeakingSummary(true);
    speakText(summary, () => {
      setIsSpeakingSummary(false);
      startReviewWalkthrough();
    });
  };

  return (
    <div className="bg-neutral-900 border border-[#ffed00]/40 rounded-xl p-6 mb-8 shadow-[0_0_15px_rgba(255,237,0,0.1)]">
      <h2 className="text-xl font-bold text-[#ffed00] mb-2 flex items-center gap-2">
        ✨ AI Performance Tutor
      </h2>
      <p className="text-neutral-300 text-lg leading-relaxed mb-6">
        &ldquo;{summary}&rdquo;
      </p>
      <button 
        onClick={handlePlaySummary}
        disabled={isSpeakingSummary}
        className="px-6 py-3 bg-[#ffed00] text-black font-bold rounded-lg shadow-md hover:bg-[#ffe100] transition-colors disabled:opacity-50"
      >
        {isSpeakingSummary ? "🔊 Speaking..." : "▶ Listen to Performance Overview"}
      </button>
    </div>
  );
}
