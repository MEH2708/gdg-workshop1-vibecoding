/**
 * Procedural Web Audio Engine for Cybersonic
 * Features 3 synthesized AI demo tracks, real-time AnalyserNode for visualizers,
 * beat tracking, and retro arcade sound effects.
 */

import track1Cover from '../assets/images/track_neon_grid_runner_1791967834146.jpg';
import track2Cover from '../assets/images/track_quantum_drift_1791967834111.jpg';
import track3Cover from '../assets/images/track_hyperdrive_overload_1791967834670.jpg';

export interface Track {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  duration: number; // in seconds
  coverArt: string;
  description: string;
  tags: string[];
  color: string; // theme accent color
  glowClass: string;
}

export const TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'CYBER//RUNNER_01',
    genre: 'SYNTH_CARRIER',
    bpm: 124,
    duration: 168, // 2:48
    coverArt: track1Cover,
    description: 'SECTOR_01 // FREQ: 124BPM. PULSE_CARRIER: C_MIN. DETUNED SAWTOOTH SYNAPSE.',
    tags: ['0x01_OUTRUN', '124_BPM', 'C_MIN', 'SAW_WAVE'],
    color: '#00f0ff', // Glitch Cyan
    glowClass: 'pixel-box',
  },
  {
    id: 'track-2',
    title: 'QUANTUM//DRIFT_02',
    genre: 'NULL_STATE_CHILL',
    bpm: 98,
    duration: 194, // 3:14
    coverArt: track2Cover,
    description: 'NULL_SPACE // MEMORY_LEAK RESONANCE: 98BPM. FM_BELLS & SUB_BASS MATRIX.',
    tags: ['0x02_NULL', '98_BPM', 'F_MIN', 'FM_MOD'],
    color: '#ff007f', // Glitch Magenta
    glowClass: 'pixel-box-magenta',
  },
  {
    id: 'track-3',
    title: 'HYPERDRIVE//OVERLOAD_03',
    genre: 'GLITCH_BREAKBEAT',
    bpm: 160,
    duration: 152, // 2:32
    coverArt: track3Cover,
    description: 'OVERFLOW // BUFFER_ERROR BREAKBEAT: 160BPM. SQUARE_WAVE TRANSIENT CORRUPTION.',
    tags: ['0x03_OVERFLOW', '160_BPM', 'D_MIN', 'CHIPTUNE'],
    color: '#00ffff', // Glitch Cyan
    glowClass: 'pixel-box',
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;

  private isPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.75;
  private sfxVolume = 0.8;
  private isMuted = false;

  private playbackTimer: number | null = null;
  private virtualTime = 0; // current time in seconds
  private lastTickTime = 0;

  // Synthesizer scheduler state
  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;

  // Listeners for UI state updates
  private stateListeners: Set<() => void> = new Set();
  private beatListeners: Set<(beat: number) => void> = new Set();

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

    // Music & SFX Gain
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

    // Analyser Node for visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public async resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public getCurrentTrack(): Track {
    return TRACKS[this.currentTrackIndex];
  }

  public getTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTime(): number {
    return this.virtualTime;
  }

  public subscribe(listener: () => void) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onBeat(listener: (beat: number) => void) {
    this.beatListeners.add(listener);
    return () => {
      this.beatListeners.delete(listener);
    };
  }

  private notify() {
    this.stateListeners.forEach((fn) => fn());
  }

  public async play() {
    await this.resume();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.startVirtualClock();
    this.startSequencer();
    this.notify();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopSequencer();
    this.stopVirtualClock();
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public skipNext() {
    this.setTrackIndex((this.currentTrackIndex + 1) % TRACKS.length);
  }

  public skipPrev() {
    this.setTrackIndex((this.currentTrackIndex - 1 + TRACKS.length) % TRACKS.length);
  }

  public setTrackIndex(index: number) {
    if (index < 0 || index >= TRACKS.length) return;
    this.currentTrackIndex = index;
    this.virtualTime = 0;
    this.currentStep = 0;
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    }
    this.notify();
  }

  public seek(seconds: number) {
    const track = this.getCurrentTrack();
    this.virtualTime = Math.max(0, Math.min(seconds, track.duration));
    // calculate step based on 16th notes
    const sixteenthPerSec = (track.bpm / 60) * 4;
    this.currentStep = Math.floor(this.virtualTime * sixteenthPerSec) % 64;
    this.notify();
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
    }
    this.notify();
  }

  private startVirtualClock() {
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    this.lastTickTime = performance.now();
    this.playbackTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      const now = performance.now();
      const delta = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      const track = this.getCurrentTrack();
      this.virtualTime += delta;
      if (this.virtualTime >= track.duration) {
        this.virtualTime = 0; // loop track seamlessly
      }
      this.notify();
    }, 200);
  }

  private stopVirtualClock() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  // --- Multi-voice Synthesizer Sequencer ---
  private startSequencer() {
    if (!this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleNotes();
  }

  private stopSequencer() {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleNotes = () => {
    if (!this.isPlaying || !this.ctx) return;

    const track = this.getCurrentTrack();
    const secondsPer16th = 60 / track.bpm / 4;
    const scheduleAheadTime = 0.2; // lookahead in seconds

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.playStep(track, this.currentStep, this.nextNoteTime);

      if (this.currentStep % 4 === 0) {
        // Quarter note beat!
        const beatNum = Math.floor(this.currentStep / 4) % 4;
        this.beatListeners.forEach((fn) => fn(beatNum));
      }

      this.nextNoteTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop of 16th notes
    }

    this.schedulerTimer = window.setTimeout(this.scheduleNotes, 40);
  };

  private playStep(track: Track, step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    if (track.id === 'track-1') {
      this.playSynthwaveStep(step, time);
    } else if (track.id === 'track-2') {
      this.playChillwaveStep(step, time);
    } else {
      this.playChiptuneStep(step, time);
    }
  }

  // Frequency conversion helper
  private mtof(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // --- Track 1: Neon Grid Runner (Synthwave) ---
  private playSynthwaveStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    // 1. Kick on 0, 4, 8, 12... (Four-on-the-floor)
    if (step % 4 === 0) {
      this.synthKick(time, 130, 42, 0.28, 0.85);
    }

    // 2. Snare on 4, 12, 20... (beats 2 and 4 of 4/4)
    if (step % 8 === 4) {
      this.synthSnare(time, 0.22, 0.7);
    }

    // 3. Hi-Hats: 16th note pulse with accents on off-beats
    if (step % 2 === 0) {
      const isOffbeat = step % 4 === 2;
      this.synthHiHat(time, isOffbeat ? 0.08 : 0.04, isOffbeat ? 0.35 : 0.18);
    }

    // 4. Bassline: Rolling 16th notes (C Minor - Eb - F - G)
    const bar = Math.floor(step / 16);
    const rootNotes = [36, 39, 41, 43]; // C2, Eb2, F2, G2
    const currentRoot = rootNotes[bar % rootNotes.length];

    // Galloping synthwave bass pattern
    const isRest = step % 4 === 1; // subtle groove pause
    if (!isRest) {
      const octaveJump = step % 4 === 0 ? 0 : 12;
      const bassFreq = this.mtof(currentRoot + octaveJump);
      this.synthSawBass(time, bassFreq, 0.12, 0.38);
    }

    // 5. Arp synth / chords: 16th-note bright neon arpeggio
    const arpNotesC = [60, 63, 67, 72, 75, 72, 67, 63]; // C4, Eb4, G4, C5, Eb5...
    const noteIdx = step % arpNotesC.length;
    const offset = bar === 1 ? 3 : bar === 2 ? 5 : bar === 3 ? 7 : 0;
    const arpFreq = this.mtof(arpNotesC[noteIdx] + offset);
    this.synthPluck(time, arpFreq, 0.16, 0.22, 'sawtooth');

    // 6. Lead melody (plays on bars 2 and 4)
    if (bar % 2 === 1 && step % 4 === 0) {
      const leadMelody = [72, 75, 74, 70, 72, 75, 79, 77];
      const leadMidi = leadMelody[(step / 4) % leadMelody.length];
      this.synthLead(time, this.mtof(leadMidi), 0.35, 0.25);
    }
  }

  // --- Track 2: Quantum Drift (Ambient Chillwave) ---
  private playChillwaveStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    // 1. Soft deep sub kick
    if (step % 8 === 0 || step % 16 === 10) {
      this.synthKick(time, 95, 35, 0.35, 0.65);
    }

    // 2. Soft clap / rim shot on beats 2 and 4
    if (step % 8 === 4) {
      this.synthHiHat(time, 0.14, 0.45);
    }

    // 3. Shimmering hats
    if (step % 2 === 1) {
      this.synthHiHat(time, 0.03, 0.15);
    }

    // 4. Sub bass pulse
    if (step % 4 === 0) {
      const bar = Math.floor(step / 16);
      const roots = [33, 29, 36, 31]; // A1, F1, C2, G1
      const freq = this.mtof(roots[bar % 4]);
      this.synthSineSub(time, freq, 0.45, 0.5);
    }

    // 5. Dreamy bell / chime on selected steps
    const bellSteps = [0, 6, 12, 18, 26, 34, 42, 50, 58];
    if (bellSteps.includes(step)) {
      const bellPitches = [65, 68, 72, 75, 77, 80, 72, 70];
      const note = bellPitches[Math.floor(step / 8) % bellPitches.length];
      this.synthBell(time, this.mtof(note), 0.8, 0.28);
    }
  }

  // --- Track 3: Hyperdrive Overload (Chiptune Drum & Bass) ---
  private playChiptuneStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Fast DnB breakbeat: Kick on 0, 10
    if (step % 16 === 0 || step % 16 === 10) {
      this.synthKick(time, 160, 48, 0.18, 0.95);
    }

    // Snare on 4, 12 (standard DnB backbeat)
    if (step % 16 === 4 || step % 16 === 12) {
      this.synthSnare(time, 0.15, 0.8);
    }

    // Fast crispy chiptune hats
    this.synthHiHat(time, 0.025, step % 2 === 0 ? 0.35 : 0.18);

    // Chiptune square wave arpeggio (rapid 16ths)
    const chiptuneScale = [62, 65, 69, 74, 77, 81, 74, 69]; // D minor arpeggios
    const bar = Math.floor(step / 16);
    const mod = bar % 2 === 0 ? 0 : 3;
    const note = chiptuneScale[step % chiptuneScale.length] + mod;
    this.synthPluck(time, this.mtof(note), 0.08, 0.2, 'square');

    // Resonant Acid Saw Bass
    if (step % 4 === 0 || step % 16 === 14) {
      const bassNotes = [38, 38, 41, 45, 36, 36, 43, 40];
      const bMidi = bassNotes[Math.floor(step / 8) % bassNotes.length];
      this.synthAcidBass(time, this.mtof(bMidi), 0.22, 0.45);
    }
  }

  // --- Voice Generators ---

  private synthKick(time: number, startFreq: number, endFreq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthSnare(time: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;

    // Noise component
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(800, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    // Tonal snap
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(220, time);
    snap.frequency.exponentialRampToValueAtTime(60, time + duration * 0.5);

    snapGain.gain.setValueAtTime(volume * 0.6, time);
    snapGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

    snap.connect(snapGain);
    snapGain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + duration);
    snap.start(time);
    snap.stop(time + duration);
  }

  private synthHiHat(time: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  private synthSawBass(time: number, freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthAcidBass(time: number, freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(320, time + duration);
    filter.Q.value = 8; // Acid resonance

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthSineSub(time: number, freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthPluck(time: number, freq: number, duration: number, volume: number, type: OscillatorType) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + duration);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthBell(time: number, freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    // FM synthesis bell: Carrier + Modulator
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, time);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.76, time); // Inharmonic chime ratio

    modGain.gain.setValueAtTime(freq * 1.5, time);
    modGain.gain.exponentialRampToValueAtTime(1, time + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrierGain.gain.setValueAtTime(volume, time);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    carrier.connect(carrierGain);
    carrierGain.connect(this.musicGain);

    modulator.start(time);
    carrier.start(time);
    modulator.stop(time + duration);
    carrier.stop(time + duration);
  }

  private synthLead(time: number, freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    // Dual saw lead with slight detune
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(12, time); // +12 cents

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  // --- Sound Effects for Snake Gameplay ---

  public playEatSfx() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  public playBonusEatSfx() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Fast arpeggiated power chime: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playTurnSfx() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playGameOverSfx() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.55);
    filter.Q.value = 6;

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.58);
  }
}

export const audioEngine = new AudioEngine();
