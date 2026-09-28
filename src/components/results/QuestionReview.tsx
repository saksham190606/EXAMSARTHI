"use client";

import React, { useState, useEffect } from 'react';
import { QuestionReviewList as BaseQuestionReviewList, QuestionReviewItem } from './QuestionReviewList';

export type { QuestionReviewItem };

export function QuestionReview(props: any) {
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  // Add this inside your functional component:
  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { intent, target } = e.detail || {};
      
      if (intent === 'CONTROL') {
        if (target === 'NEXT') {
          // REPLACE THIS with your actual next question function
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi_review_next'));
          }
        } else if (target === 'PREVIOUS') {
          // REPLACE THIS with your actual previous question function
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi_review_prev'));
          }
        } else if (target === 'STOP' || target === 'PAUSE') {
          // Turn off the walkthrough
          setIsWalkthroughActive(false); 
          if (typeof window !== 'undefined') window.speechSynthesis.cancel();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi_review_stop'));
          }
        } else if (target === 'REPEAT') {
          // Trigger your function that reads the current question again
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi_review_repeat'));
          }
        }
      }
    };

    window.addEventListener('ai_voice_command', handleVoiceCommand);
    return () => window.removeEventListener('ai_voice_command', handleVoiceCommand);
  }, []);

  return <BaseQuestionReviewList {...props} isWalkthroughActive={props.isWalkthroughActive ?? isWalkthroughActive} />;
}

export { QuestionReview as QuestionReviewList };
export default QuestionReview;
