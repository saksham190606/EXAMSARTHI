/**
 * Exam Saarthi - Shared Microphone Permission Helper
 * Invoked during explicit user gestures (e.g. clicking "Start Practice" or "Start Exam")
 * to trigger the browser's microphone permission prompt immediately before entering the exam screen.
 */
export async function requestMicPermission(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release tracks so speech recognition has exclusive hardware access
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (e) {
      console.warn('[Microphone] Permission request was not granted during user gesture:', e);
      return false;
    }
  }
  return false;
}
