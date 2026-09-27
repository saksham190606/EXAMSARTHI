/**
 * Exam Saarthi - Audio Session & Microphone Initializer
 * Executed during explicit user gestures (e.g. clicking "Start Practice", "Take Mock Exam", or entering exam)
 * 1. Solves Browser Autoplay & Audio Lock:
 *    - Requests microphone access via getUserMedia
 *    - Primes window.speechSynthesis with an empty utterance to unlock browser audio playback
 * 2. Stores examSessionStarted = true in sessionStorage so the exam screen knows it is authorized to speak immediately
 */
export async function initializeExamAudioSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Prime SpeechSynthesis under user gesture to unlock browser audio autoplay
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const primeUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(primeUtterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn('[AudioSession] Failed to prime speechSynthesis:', e);
    }
  }

  // 2. Set authorization flag in sessionStorage
  try {
    sessionStorage.setItem('examSessionStarted', 'true');
  } catch (e) {}

  // 3. Request mic access
  let micGranted = false;
  if (navigator?.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release tracks so SpeechRecognition has uncontended hardware access
      stream.getTracks().forEach((track) => track.stop());
      micGranted = true;
    } catch (e) {
      console.warn('[AudioSession] Microphone permission was not granted during gesture:', e);
    }
  }

  return micGranted;
}

// Backward-compatibility alias
export const requestMicPermission = initializeExamAudioSession;
