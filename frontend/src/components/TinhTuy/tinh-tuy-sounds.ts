/**
 * TinhTuySoundManager — Web Audio API SFX synthesizer + MP3 BGM.
 * Singleton. Init on first user gesture for iOS compatibility.
 * All audio nodes disconnected via onended to prevent memory leaks.
 */

type SFXType = 'diceRoll' | 'move' | 'purchase' | 'rentPay' | 'cardDraw'
  | 'buildHouse' | 'island' | 'victory' | 'yourTurn' | 'chat' | 'timerWarning';

const STORAGE_KEY_VOLUME = 'tt_sound_volume';
const STORAGE_KEY_MUTED = 'tt_sound_muted';

/** Safe localStorage wrapper for Safari private mode */
function safeGetItem(key: string, fallback: string): string {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Safari private mode */ }
}

/** Disconnect all audio nodes when oscillator ends */
function autoCleanup(osc: OscillatorNode | AudioBufferSourceNode, ...nodes: AudioNode[]): void {
  osc.onended = () => {
    try {
      osc.disconnect();
      nodes.forEach(n => n.disconnect());
    } catch { /* already disconnected */ }
  };
}

class TinhTuySoundManager {
  private audioCtx: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private _volume: number;
  private _isMuted: boolean;
  private initialized = false;

  constructor() {
    this._volume = parseFloat(safeGetItem(STORAGE_KEY_VOLUME, '0.5'));
    this._isMuted = safeGetItem(STORAGE_KEY_MUTED, 'false') === 'true';
  }

  /** Must call on first user interaction (click/touch) for iOS unlock */
  init(): void {
    if (this.initialized) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // iOS unlock: resume suspended context
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      // Play silent dummy to unlock iOS mute switch behavior
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

  playSFX(type: SFXType): void {
    if (this._isMuted || !this.audioCtx) return;
    // Resume suspended AudioContext (can happen after tab switch on some browsers)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
      return; // will play next tick
    }
    if (this.audioCtx.state !== 'running') return;
    try {
      const ctx = this.audioCtx;
      const vol = this._volume;
      switch (type) {
        case 'diceRoll': this.sfxDiceRoll(ctx, vol); break;
        case 'move': this.sfxMove(ctx, vol); break;
        case 'purchase': this.sfxPurchase(ctx, vol); break;
        case 'rentPay': this.sfxRentPay(ctx, vol); break;
        case 'cardDraw': this.sfxCardDraw(ctx, vol); break;
        case 'buildHouse': this.sfxBuildHouse(ctx, vol); break;
        case 'island': this.sfxIsland(ctx, vol); break;
        case 'victory': this.sfxVictory(ctx, vol); break;
        case 'yourTurn': this.sfxYourTurn(ctx, vol); break;
        case 'chat': this.sfxChat(ctx, vol); break;
        case 'timerWarning': this.sfxTimerWarning(ctx, vol); break;
      }
    } catch { /* ignore audio errors */ }
  }

  // ─── SFX Synthesizers (all nodes cleaned up via autoCleanup) ──

  private sfxDiceRoll(ctx: AudioContext, vol: number): void {
    const len = 0.4;
    const bufferSize = ctx.sampleRate * len;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + len);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + len);
    autoCleanup(src, filter, gain);
  }

  private sfxMove(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
    autoCleanup(osc, gain);
  }

  private sfxPurchase(ctx: AudioContext, vol: number): void {
    const notes = [261.63, 329.63, 392.0]; // C E G
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 + i * 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + 0.5 + i * 0.1);
      autoCleanup(osc, gain);
    });
  }

  private sfxRentPay(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    osc.type = 'square';
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
    autoCleanup(osc, gain);
  }

  private sfxCardDraw(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
    autoCleanup(osc, gain);
  }

  private sfxBuildHouse(ctx: AudioContext, vol: number): void {
    // Cheerful ascending arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35 + i * 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 0.35 + i * 0.08);
      autoCleanup(osc, gain);
    });
  }

  private sfxIsland(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
    autoCleanup(osc, gain);
  }

  private sfxVictory(ctx: AudioContext, vol: number): void {
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5
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

  /** Gentle triple-beep warning when turn timer is running low */
  private sfxTimerWarning(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    // Three soft sine beeps at B5 (988Hz), spaced 0.2s apart — audible but not harsh
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

  // ─── BGM — MP3 background music ──────────────────────

  playBGM(_track?: 'lobby' | 'game'): void {
    this.stopBGM();
    this.bgmElement = new Audio('/background.mp3');
    this.bgmElement.loop = true;
    this.bgmElement.volume = this._isMuted ? 0 : this._volume * 0.28;
    this.bgmElement.play().catch(() => { /* autoplay blocked */ });
  }

  stopBGM(): void {
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement.src = '';
      this.bgmElement = null;
    }
  }

  /** Page Visibility handler — pause/resume BGM */
  handleVisibilityChange = (): void => {
    if (!this.bgmElement) return;
    if (document.hidden) {
      this.bgmElement.pause();
    } else if (!this._isMuted) {
      this.bgmElement.play().catch(() => {});
    }
  };

  // ─── Controls ─────────────────────────────────────────

  get volume(): number { return this._volume; }
  get isMuted(): boolean { return this._isMuted; }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    safeSetItem(STORAGE_KEY_VOLUME, String(this._volume));
    if (this.bgmElement) {
      this.bgmElement.volume = this._isMuted ? 0 : this._volume * 0.28;
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    safeSetItem(STORAGE_KEY_MUTED, String(this._isMuted));
    if (this.bgmElement) {
      this.bgmElement.volume = this._isMuted ? 0 : this._volume * 0.28;
    }
    return this._isMuted;
  }

  dispose(): void {
    this.stopBGM();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.initialized = false;
  }
}

/** Singleton sound manager */
export const tinhTuySounds = new TinhTuySoundManager();
