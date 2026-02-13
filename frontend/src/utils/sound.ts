/**
 * Sound utility using Web Audio API.
 * Generates lightweight notification sounds without external files.
 * Reuses a single AudioContext, properly disconnects nodes after use.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
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
 * Two-tone ascending beep (~150ms), gentle volume.
 * All nodes are disconnected after playback to prevent leaks.
 */
export function playChatSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const endTime = now + 0.18;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.07);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1175, now + 0.07);
    osc2.connect(gain);
    osc2.start(now + 0.07);
    osc2.stop(endTime);

    // Disconnect all nodes after playback to prevent memory leak
    osc2.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      gain.disconnect();
    };
  } catch {
    // Silently fail — audio is non-critical
  }
}
