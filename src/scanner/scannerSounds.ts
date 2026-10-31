let context: AudioContext | null = null;

/** iPadOS Safari requires an explicit tap to unlock synthesized audio. */
export async function unlockScannerSound(): Promise<boolean> {
  try {
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch { return false; }
}

export function scannerSound(kind: 'success' | 'error'): void {
  if (!context || context.state !== 'running') return;
  const start = context.currentTime;
  const notes = kind === 'success'
    ? [{ hz: 780, time: 0, duration: 0.095 }, { hz: 1040, time: 0.115, duration: 0.16 }]
    : [{ hz: 330, time: 0, duration: 0.18 }, { hz: 240, time: 0.22, duration: 0.22 }];
  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'success' ? 'sine' : 'triangle';
    oscillator.frequency.value = note.hz;
    const when = start + note.time;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.14, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + note.duration + 0.01);
  }
}
