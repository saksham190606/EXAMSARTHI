import React, { useState, useEffect } from 'react';

export default function ReviewWalkthrough({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
          <p><strong>Your Answer:</strong> <span className={q.userAnswer === q.correctAnswer ? "text-green-400" : "text-red-400"}>{q.userAnswer}</span></p>
          {q.userAnswer !== q.correctAnswer && (
            <p><strong>Correct Answer:</strong> <span className="text-green-400">{q.correctAnswer}</span></p>
          )}
        </div>

        <div className="p-4 rounded bg-gray-800">
          <h3 className="font-bold mb-2 text-yellow-400">Explanation</h3>
          <p className="leading-relaxed">{q.explanation}</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-center gap-4">
        <button onClick={() => window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { target: 'PREVIOUS' } }))} className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600">Previous</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { target: 'PAUSE' } }))} className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600">Pause</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { target: 'STOP' } }))} className="px-6 py-2 bg-red-900 rounded hover:bg-red-800">Stop</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { target: 'NEXT' } }))} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">Next</button>
      </div>
    </div>
  );
}
