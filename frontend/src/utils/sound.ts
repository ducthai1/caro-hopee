/**
 * Sound utility using Web Audio API.
 * Generates lightweight notification sounds without external files.
 * Reuses a single AudioContext to avoid resource waste.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a short chat notification chime.
 * Two-tone ascending beep (~100ms), gentle volume.
 */
export function playChatSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  // First tone
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.07);

  // Second tone (higher)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1175, now + 0.07); // D6
  osc2.connect(gain);
  osc2.start(now + 0.07);
  osc2.stop(now + 0.15);
}
