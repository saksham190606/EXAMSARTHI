export async function sonifyData(dataPoints: number[], min: number = 0, max: number = 100) {
  if (typeof window === 'undefined' || !window.AudioContext) {
    console.warn("Web Audio API not supported in this environment.");
    return;
  }

  // Use standard AudioContext or webkitAudioContext for Safari
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  const playTone = (frequency: number, duration: number, startTime: number) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Envelope to avoid clicking
    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.5, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const durationPerPoint = 0.3; // 300ms per point
  let startTime = audioCtx.currentTime + 0.1;

  for (let i = 0; i < dataPoints.length; i++) {
    const val = dataPoints[i];
    // Map data value to a frequency range, e.g., 200Hz to 800Hz
    const normalized = (val - min) / (max - min);
    const frequency = 200 + normalized * 600;
    
    playTone(frequency, durationPerPoint, startTime);
    startTime += durationPerPoint;
  }

  // Close context after playback completes
  setTimeout(() => {
    if (audioCtx.state !== 'closed') {
      audioCtx.close();
    }
  }, (dataPoints.length * durationPerPoint * 1000) + 500);
}
