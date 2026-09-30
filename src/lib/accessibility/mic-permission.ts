import { stopSpeaking } from '@/lib/voice/useVoiceEngine';

/**
 * Ensures voices are retrieved and cached by the browser.
 * Resolves with the voices list or an empty list if timeout expires.
 */
export function fetchAvailableVoices(timeoutMs: number = 1500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  const existingVoices = window.speechSynthesis.getVoices();
  if (existingVoices && existingVoices.length > 0) {
    return Promise.resolve(existingVoices);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const handleVoices = () => {
      if (resolved) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);

    // Also poll every 100ms in case the voiceschanged event is swallowed
    const interval = setInterval(() => {
      if (resolved) {
        clearInterval(interval);
        return;
      }
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        resolved = true;
        clearInterval(interval);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        resolve(v);
      }
    }, 100);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(interval);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        resolve(window.speechSynthesis.getVoices() || []);
      }
    }, timeoutMs);
  });
}

/**
 * Exam Saarthi - Audio Session & Microphone Initializer
 * Executed during explicit user gestures or landing page initialization.
 * 1. Solves Browser Autoplay & Audio Lock:
 *    - Primes window.speechSynthesis with an empty utterance to unlock browser audio playback
 *    - Requests microphone access via getUserMedia without locking the hardware stream
 * 2. Stores examSessionStarted = true in sessionStorage so the exam screen knows it is authorized to speak immediately
 */
export async function initializeExamAudioSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Prime SpeechSynthesis under user gesture to unlock browser audio autoplay
  if ('speechSynthesis' in window) {
    try {
      stopSpeaking();
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

  // 3. Query permissions API first if supported
  if (navigator?.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') {
        return true;
      }
    } catch (_) {}
  }

  // 4. Request mic access via getUserMedia
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

