"use client";

import { useState, useEffect } from 'react';
import { speakText, startListening } from '@/lib/voice/useVoiceEngine';

interface AITutorCardProps {
  results: { score: number; totalQuestions: number };
  correctTopics?: string;
  weakTopics?: string;
}

export default function AITutorCard({ results, correctTopics, weakTopics }: AITutorCardProps) {
  const [summary, setSummary] = useState("Analyzing your performance...");
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

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
        setSummary(data?.summary || "Analysis complete. You may now review your answers.");
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
      startListening(); // Automatically open mic here
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
