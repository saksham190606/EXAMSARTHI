import React, { useState, useEffect, useCallback } from 'react';

export default function ReviewWalkthrough({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract speech logic so it can be called on mount AND by the Repeat button
  const speakCurrentQuestion = useCallback(() => {
    if (typeof window === 'undefined' || !results?.questions) return;
    const q = results.questions[currentIndex];
    const text = `Question ${currentIndex + 1}. ${q.questionText}. You answered ${q.userAnswer}. ${q.userAnswer === q.correctAnswer ? "Correct!" : `Incorrect. The correct answer is ${q.correctAnswer}.`} Explanation: ${q.explanation || "No explanation provided."}`;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, [currentIndex, results]);

  // Auto-read when the index changes
  useEffect(() => {
    speakCurrentQuestion();
  }, [speakCurrentQuestion]);

  const handleStop = () => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    onClose();
  };

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

      {/* Hardcoded Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-center gap-4">
        <button onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))} className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">Previous</button>
        <button onClick={speakCurrentQuestion} className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors">Repeat</button>
        <button onClick={handleStop} className="px-6 py-2 bg-red-900 rounded hover:bg-red-800 transition-colors">Stop</button>
        <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, results.questions.length - 1))} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 transition-colors">Next</button>
      </div>
    </div>
  );
}
