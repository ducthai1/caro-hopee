/**
 * GoSoundManager — Web Audio API SFX synthesizer for Go game.
 * Singleton. Init on first user gesture for iOS compatibility.
 * All audio nodes disconnected via onended to prevent memory leaks.
 */

type GoSFXType = 'stonePlace' | 'stoneCapture' | 'pass' | 'timerWarning'
  | 'victory' | 'defeat' | 'yourTurn' | 'chat';

const STORAGE_KEY_VOLUME = 'go_sound_volume';
const STORAGE_KEY_MUTED = 'go_sound_muted';

function safeGetItem(key: string, fallback: string): string {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Safari private mode */ }
}

function autoCleanup(osc: OscillatorNode | AudioBufferSourceNode, ...nodes: AudioNode[]): void {
  osc.onended = () => {
    try {
      osc.disconnect();
      nodes.forEach(n => n.disconnect());
    } catch { /* already disconnected */ }
  };
}

class GoSoundManager {
  private audioCtx: AudioContext | null = null;
  private _volume: number;
  private _isMuted: boolean;
  private initialized = false;

  constructor() {
    this._volume = parseFloat(safeGetItem(STORAGE_KEY_VOLUME, '0.5'));
    this._isMuted = safeGetItem(STORAGE_KEY_MUTED, 'false') === 'true';
  }

  init(): void {
    if (this.initialized) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      const gain = this.audioCtx.createGain();
      gain.gain.value = 0;
      const osc = this.audioCtx.createOscillator();
      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.001);
      autoCleanup(osc, gain);
      this.initialized = true;
    } catch { /* Web Audio not supported */ }
  }

  playSFX(type: GoSFXType): void {
    if (this._isMuted || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
      return;
    }
    if (this.audioCtx.state !== 'running') return;
    try {
      const ctx = this.audioCtx;
      const vol = this._volume;
      switch (type) {
        case 'stonePlace': this.sfxStonePlace(ctx, vol); break;
        case 'stoneCapture': this.sfxStoneCapture(ctx, vol); break;
        case 'pass': this.sfxPass(ctx, vol); break;
        case 'timerWarning': this.sfxTimerWarning(ctx, vol); break;
        case 'victory': this.sfxVictory(ctx, vol); break;
        case 'defeat': this.sfxDefeat(ctx, vol); break;
        case 'yourTurn': this.sfxYourTurn(ctx, vol); break;
        case 'chat': this.sfxChat(ctx, vol); break;
      }
    } catch { /* ignore audio errors */ }
  }

  /** Sharp click — sine burst at 800Hz with fast 50ms decay */
  private sfxStonePlace(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
    autoCleanup(osc, gain);
  }

  /** Multiple clicks + swoosh — 3 descending tones for capture */
  private sfxStoneCapture(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    [700, 550, 400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.06 + 0.08);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.08);
      autoCleanup(osc, gain);
    });
  }

  /** Soft double-tap for pass */
  private sfxPass(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    [0, 0.12].forEach(offset => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
      autoCleanup(osc, gain);
    });
  }

  /** Triple beep warning at 10s/5s remaining */
  private sfxTimerWarning(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    [0, 0.2, 0.4].forEach(offset => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 988;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
      autoCleanup(osc, gain);
    });
  }

  /** Ascending C major arpeggio for victory */
  private sfxVictory(ctx: AudioContext, vol: number): void {
    const notes = [261.63, 329.63, 392.0, 523.25];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8 + i * 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + 0.8 + i * 0.15);
      autoCleanup(osc, gain);
    });
  }

  /** Descending minor for defeat */
  private sfxDefeat(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.6);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
    autoCleanup(osc, gain);
  }

  /** Gentle chime for your turn */
  private sfxYourTurn(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
    autoCleanup(osc, gain);
  }

  /** Quick blip for chat */
  private sfxChat(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
    autoCleanup(osc, gain);
  }

  // ─── Controls ─────────────────────────────────────────

  get volume(): number { return this._volume; }
  get isMuted(): boolean { return this._isMuted; }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    safeSetItem(STORAGE_KEY_VOLUME, String(this._volume));
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    safeSetItem(STORAGE_KEY_MUTED, String(this._isMuted));
    return this._isMuted;
  }

  dispose(): void {
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.initialized = false;
  }
}

export const goSounds = new GoSoundManager();
