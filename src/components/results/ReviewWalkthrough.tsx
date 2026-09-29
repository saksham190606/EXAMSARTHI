import React, { useState, useEffect } from 'react';

export default function ReviewWalkthrough({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle Voice Commands scoped specifically to this active panel
  useEffect(() => {
    const handleNav = (e: any) => {
      const { target } = e.detail;
      if (target === 'NEXT') setCurrentIndex(prev => Math.min(prev + 1, results.questions.length - 1));
      if (target === 'PREVIOUS') setCurrentIndex(prev => Math.max(prev - 1, 0));
      if (target === 'PAUSE') if (typeof window !== 'undefined') window.speechSynthesis.pause();
      if (target === 'STOP') {
        if (typeof window !== 'undefined') window.speechSynthesis.cancel();
        onClose();
      }
    };
    window.addEventListener('ai_voice_command', handleNav);
    return () => window.removeEventListener('ai_voice_command', handleNav);
  }, [results, onClose]);

  // Handle Auto-Narration
  useEffect(() => {
    if (!results?.questions) return;
    const q = results.questions[currentIndex];
    const text = `Question ${currentIndex + 1}. ${q.questionText}. You answered ${q.userAnswer}. ${q.userAnswer === q.correctAnswer ? "Correct!" : `Incorrect. The correct answer is ${q.correctAnswer}.`} Explanation: ${q.explanation || "No explanation provided."}`;
    
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }, [currentIndex, results]);

  const q = results?.questions[currentIndex];
  if (!q) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex-grow overflow-y-auto pb-24 space-y-6">
        <h2 className="text-2xl font-bold text-yellow-400">Question {currentIndex + 1}</h2>
        <p className="text-xl">{q.questionText}</p>
        
        <div className="p-4 rounded border border-gray-700 bg-gray-900 space-y-3">
          <p>
            <strong>Your Answer:</strong> <span className={q.userAnswer === q.correctAnswer ? "text-green-400" : "text-red-400"}>{q.userAnswer}</span>
          </p>
          {q.userAnswer !== q.correctAnswer && (
            <p>
              <strong>Correct Answer:</strong> <span className="text-green-400">{q.correctAnswer}</span>
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="font-bold mb-2">Explanation</h3>
            <p className="text-gray-300">{q.explanation || "No explanation provided."}</p>
          </div>
        </div>
      </div>
      
      {/* Footer controls */}
      <div className="flex-none pt-6 border-t border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
        <button 
          onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Previous
        </button>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') window.speechSynthesis.cancel();
            onClose();
          }}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors shadow-[0_0_10px_rgba(220,38,38,0.5)]"
        >
          Exit Walkthrough
        </button>
        <button 
          onClick={() => setCurrentIndex(prev => Math.min(prev + 1, results.questions.length - 1))}
          disabled={currentIndex === results.questions.length - 1}
          className="px-4 py-2 bg-[#ffed00] text-black font-bold rounded hover:bg-[#ffe100] disabled:opacity-50 transition-colors shadow-[0_0_10px_rgba(255,237,0,0.5)]"
        >
          Next
        </button>
      </div>
    </div>
  );
}
