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
 * Safely disconnect an AudioNode, ignoring errors if already disconnected.
 */
function safeDisconnect(node: AudioNode): void {
  try { node.disconnect(); } catch { /* already disconnected */ }
}

/**
 * Play a bubbly "pop" chat notification.
 * Quick frequency sweep (600→1400Hz) + soft harmonic overlay = playful bubble pop.
 * All nodes are disconnected after playback to prevent leaks.
 *
 * PERF FIX: Added fallback setTimeout cleanup. If AudioContext is suspended,
 * oscillator.onended may never fire → nodes leak forever. The fallback timer
 * guarantees cleanup within 2 seconds regardless.
 */
export function playChatSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master gain — gentle volume
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.setValueAtTime(0.15, now);
    master.gain.linearRampToValueAtTime(0.12, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    // Main bubble: quick upward frequency sweep (pop feel)
    const pop = ctx.createOscillator();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(600, now);
    pop.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    pop.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    pop.connect(master);
    pop.start(now);
    pop.stop(now + 0.15);

    // Soft harmonic sparkle on top (triangle wave, higher pitch)
    const sparkle = ctx.createOscillator();
    sparkle.type = 'triangle';
    sparkle.frequency.setValueAtTime(1800, now + 0.03);
    sparkle.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
    const sparkleGain = ctx.createGain();
    sparkleGain.connect(master);
    sparkleGain.gain.setValueAtTime(0, now);
    sparkleGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    sparkle.connect(sparkleGain);
    sparkle.start(now + 0.03);
    sparkle.stop(now + 0.2);

    // Track whether cleanup ran via onended
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      safeDisconnect(pop);
      safeDisconnect(sparkle);
      safeDisconnect(sparkleGain);
      safeDisconnect(master);
    };

    // Primary cleanup: when oscillator ends naturally
    sparkle.onended = cleanup;

    // PERF FIX: Fallback cleanup — if AudioContext is suspended or onended never fires,
    // guarantee nodes are disconnected within 2 seconds to prevent memory leak.
    setTimeout(cleanup, 2000);
  } catch {
    // Silently fail — audio is non-critical
  }
}
