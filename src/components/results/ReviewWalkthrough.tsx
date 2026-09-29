import React, { useState, useEffect, useCallback } from 'react';

export default function ReviewWalkthrough({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const questions = results?.questions || [];
  const q = questions[currentIndex];

  // Extract speech logic so it can be called on mount AND by the Repeat button
  const speakCurrentQuestion = useCallback(() => {
    if (typeof window === 'undefined' || !results?.questions || results.questions.length === 0) return;
    const currentQ = results.questions[currentIndex];
    if (!currentQ) return;
    const qText = currentQ.questionText || currentQ.text || `Question ${currentIndex + 1}`;
    const userAns = currentQ.userAnswer || "Not answered";
    const correctAns = currentQ.correctAnswer || "Not specified";
    const isCorrect = currentQ.isCorrect !== undefined ? currentQ.isCorrect : (userAns === correctAns);
    const text = `Question ${currentIndex + 1}. ${qText}. You answered ${userAns}. ${isCorrect ? "Correct!" : `Incorrect. The correct answer is ${correctAns}.`} Explanation: ${currentQ.explanation || "No explanation provided."}`;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, [currentIndex, results]);

  // Auto-read when the index changes
  useEffect(() => {
    speakCurrentQuestion();
  }, [speakCurrentQuestion]);

  // Handle Voice Commands scoped specifically to this active panel as fallback
  useEffect(() => {
    const handleNav = (e: any) => {
      const { target } = e.detail || {};
      const total = results?.questions?.length || 0;
      if (target === 'NEXT') setCurrentIndex(prev => Math.min(prev + 1, Math.max(0, total - 1)));
      if (target === 'PREVIOUS') setCurrentIndex(prev => Math.max(prev - 1, 0));
      if (target === 'REPEAT') speakCurrentQuestion();
      if (target === 'PAUSE') {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
      }
      if (target === 'RESUME') {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.resume();
      }
      if (target === 'STOP') {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        onClose();
      }
    };
    window.addEventListener('ai_voice_command', handleNav);
    return () => window.removeEventListener('ai_voice_command', handleNav);
  }, [results, onClose, speakCurrentQuestion]);

  const handleStop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    onClose();
  };

  if (!q || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white p-8 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-yellow-400">Review Walkthrough</h2>
        <p className="text-gray-300">No question details available for walkthrough review.</p>
        <button 
          id="walkthrough-btn-close-empty"
          onClick={handleStop}
          className="px-6 py-2 bg-red-900 rounded hover:bg-red-800 transition-colors font-semibold"
        >
          Close Review
        </button>
      </div>
    );
  }

  const isCorrect = q.isCorrect !== undefined ? q.isCorrect : (q.userAnswer === q.correctAnswer);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex-grow overflow-y-auto pb-24 space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-2xl font-bold text-yellow-400">Question {currentIndex + 1} of {questions.length}</h2>
          <button 
            id="walkthrough-btn-close-top"
            onClick={handleStop}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        <p className="text-xl leading-relaxed text-gray-100">{q.questionText || q.text}</p>
        
        <div className="p-4 rounded border border-gray-700 bg-gray-900 space-y-3">
          <p>
            <strong>Your Answer: </strong>
            <span className={isCorrect ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
              {q.userAnswer || "Not answered"}
            </span>
          </p>
          {(!isCorrect || q.correctAnswer) && (
            <p><strong>Correct Answer: </strong> <span className="text-green-400 font-semibold">{q.correctAnswer}</span></p>
          )}
        </div>

        {q.explanation && (
          <div className="p-4 rounded bg-gray-800">
            <h3 className="font-bold mb-2 text-yellow-400">Explanation</h3>
            <p className="leading-relaxed text-gray-200">{q.explanation}</p>
          </div>
        )}
      </div>

      {/* Hardcoded Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-center items-center gap-4 z-10">
        <button 
          id="walkthrough-btn-prev"
          onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))} 
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          Previous
        </button>
        <button 
          id="walkthrough-btn-repeat"
          onClick={speakCurrentQuestion} 
          className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors font-medium"
        >
          Repeat
        </button>
        <button 
          id="walkthrough-btn-stop"
          onClick={handleStop} 
          className="px-6 py-2 bg-red-900 rounded hover:bg-red-800 transition-colors font-medium"
        >
          Stop
        </button>
        <button 
          id="walkthrough-btn-next"
          onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))} 
          disabled={currentIndex >= questions.length - 1}
          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
