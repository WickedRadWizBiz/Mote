/**
 * Zero-sample procedural Web Audio DSP meditation engine for Mote.
 * Synthesizes solar drone, binaural entrainment, modal keystroke physical modeling,
 * breath-coupled LFO wind, and water release granular chimes.
 */

import { getSolarScale, categorizeChar, noteToFreq } from './scales';

class DSPEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Drone & Meditation nodes
  private droneGain: GainNode | null = null;
  private droneOscLeft: OscillatorNode | null = null;
  private droneOscRight: OscillatorNode | null = null;
  private binauralPannerLeft: StereoPannerNode | null = null;
  private binauralPannerRight: StereoPannerNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // Noise wind for breath coupling
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  // Typing sprint ducking detector
  private lastKeystrokeTime: number = 0;
  private keystrokeRate: number = 0; // keystrokes per second

  // Current meditation mode
  private currentMode: 'off' | 'stillness' | 'drift' = 'off';
  private currentPhase: 'daylight' | 'goldenHour' | 'dusk' | 'sunrise' | 'night' = 'daylight';

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupDroneSystem();
      this.setupWindSystem();
    } catch {
      // AudioContext not allowed before gesture or not supported
    }
  }

  private ensureRunning() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupDroneSystem() {
    if (!this.ctx || !this.masterGain) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.droneGain.connect(this.droneFilter);
    this.droneFilter.connect(this.masterGain);
  }

  private setupWindSystem() {
    if (!this.ctx || !this.masterGain) return;

    // Generate 5 seconds of procedural pink noise buffer
    const bufferSize = this.ctx.sampleRate * 5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.noiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.noiseNode.start();
  }

  public setSolarPhase(phase: 'daylight' | 'goldenHour' | 'dusk' | 'sunrise' | 'night') {
    this.currentPhase = phase;
    if (this.currentMode !== 'off') {
      this.updateDroneFrequencies();
    }
  }

  public setMeditationMode(mode: 'off' | 'stillness' | 'drift') {
    this.ensureRunning();
    this.currentMode = mode;
    if (!this.ctx || !this.droneGain || !this.windGain) return;

    const t = this.ctx.currentTime;

    if (mode === 'off') {
      this.droneGain.gain.linearRampToValueAtTime(0, t + 1.2);
      this.windGain.gain.linearRampToValueAtTime(0, t + 1.2);
      this.stopDroneOscillators();
      return;
    }

    this.startDroneOscillators();

    if (mode === 'stillness') {
      // Theta entrainment 6.0 Hz delta f, breath wind layer
      this.droneGain.gain.linearRampToValueAtTime(0.22, t + 1.5);
      this.windGain.gain.linearRampToValueAtTime(0.12, t + 1.5);
    } else if (mode === 'drift') {
      // Alpha entrainment 10.5 Hz delta f, softer wind, warm drone
      this.droneGain.gain.linearRampToValueAtTime(0.18, t + 1.5);
      this.windGain.gain.linearRampToValueAtTime(0.04, t + 1.5);
    }

    this.updateDroneFrequencies();
  }

  private startDroneOscillators() {
    if (!this.ctx || !this.droneFilter) return;
    this.stopDroneOscillators();

    const config = getSolarScale(this.currentPhase);
    const baseFreq = config.binauralBaseFreq;

    // Delta f for Theta (6.0Hz) or Alpha (10.5Hz)
    const deltaF = this.currentMode === 'stillness' ? 6.0 : 10.5;

    this.droneOscLeft = this.ctx.createOscillator();
    this.droneOscRight = this.ctx.createOscillator();

    this.droneOscLeft.type = config.waveType;
    this.droneOscRight.type = config.waveType;

    this.droneOscLeft.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    this.droneOscRight.frequency.setValueAtTime(baseFreq + deltaF, this.ctx.currentTime);

    this.binauralPannerLeft = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    this.binauralPannerRight = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    if (this.binauralPannerLeft && this.binauralPannerRight && this.droneGain) {
      this.binauralPannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);
      this.binauralPannerRight.pan.setValueAtTime(1, this.ctx.currentTime);

      this.droneOscLeft.connect(this.binauralPannerLeft);
      this.binauralPannerLeft.connect(this.droneGain);

      this.droneOscRight.connect(this.binauralPannerRight);
      this.binauralPannerRight.connect(this.droneGain);
    } else if (this.droneGain) {
      this.droneOscLeft.connect(this.droneGain);
      this.droneOscRight.connect(this.droneGain);
    }

    this.droneOscLeft.start();
    this.droneOscRight.start();
  }

  private stopDroneOscillators() {
    try {
      if (this.droneOscLeft) {
        this.droneOscLeft.stop();
        this.droneOscLeft.disconnect();
        this.droneOscLeft = null;
      }
      if (this.droneOscRight) {
        this.droneOscRight.stop();
        this.droneOscRight.disconnect();
        this.droneOscRight = null;
      }
    } catch {
      // Ignored
    }
  }

  private updateDroneFrequencies() {
    if (!this.ctx || !this.droneOscLeft || !this.droneOscRight || !this.droneFilter) return;

    const config = getSolarScale(this.currentPhase);
    const baseFreq = config.binauralBaseFreq;
    const deltaF = this.currentMode === 'stillness' ? 6.0 : 10.5;
    const t = this.ctx.currentTime;

    this.droneOscLeft.frequency.exponentialRampToValueAtTime(baseFreq, t + 1.0);
    this.droneOscRight.frequency.exponentialRampToValueAtTime(baseFreq + deltaF, t + 1.0);
    this.droneFilter.frequency.exponentialRampToValueAtTime(config.lpfCutoff, t + 1.0);
  }

  /**
   * Breath-coupled LFO hook: called each animation frame during Stillness mode.
   * `breathRatio`: 0.0 (exhale) to 1.0 (inhale).
   */
  public updateBreathPhysics(breathRatio: number) {
    if (!this.ctx || this.currentMode !== 'stillness') return;

    const t = this.ctx.currentTime;
    if (this.droneFilter) {
      // Modulate ZDF low-pass filter between 200Hz and 650Hz
      const targetFreq = 200 + breathRatio * 450;
      this.droneFilter.frequency.setTargetAtTime(targetFreq, t, 0.08);
    }

    if (this.windFilter && this.windGain) {
      // Modulate breath wind
      const windFreq = 250 + breathRatio * 350;
      this.windFilter.frequency.setTargetAtTime(windFreq, t, 0.08);
      const windVol = 0.04 + breathRatio * 0.12;
      this.windGain.gain.setTargetAtTime(windVol, t, 0.08);
    }
  }

  /**
   * Modal Resonator physical modeling keystrokes:
   * Vowels -> Rhodes / FM piano bell
   * Consonants -> Resonant wooden marimba
   * Fast sprint dynamically ducks decay and volume.
   */
  public playKeystroke(char: string) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const now = performance.now();
    const timeSinceLast = now - this.lastKeystrokeTime;
    this.lastKeystrokeTime = now;

    // Update typing sprint rate (keystrokes per sec)
    if (timeSinceLast < 600) {
      this.keystrokeRate = Math.min(10, this.keystrokeRate * 0.8 + (1000 / Math.max(50, timeSinceLast)) * 0.2);
    } else {
      this.keystrokeRate = Math.max(0, this.keystrokeRate * 0.5);
    }

    // Ducking factor: 1.0 (slow) to 0.4 (fast sprint)
    const duckFactor = Math.max(0.35, 1 - (this.keystrokeRate / 10) * 0.65);
    const { timbre, freq } = categorizeChar(char);
    const t = this.ctx.currentTime;

    if (timbre === 'vowel_rhodes') {
      // Rhodes / FM Bell: Sine fundamental + overtone + soft saturation
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq, t);
      osc2.frequency.setValueAtTime(freq * 2.756, t); // Bell harmonic

      const vol = 0.14 * duckFactor;
      const decaySec = 0.35 * duckFactor;

      gainNode.gain.setValueAtTime(vol, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + decaySec);
      osc2.stop(t + decaySec);
    } else if (timbre === 'consonant_marimba') {
      // Resonant marimba wood click: short resonant bandpass impulse
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // Pitch drop envelope on wood strike
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, t);
      filter.Q.setValueAtTime(4.0, t);

      const vol = 0.16 * duckFactor;
      const decaySec = 0.09 * duckFactor;

      gainNode.gain.setValueAtTime(vol, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + decaySec);
    } else {
      // Punctuation / space: gentle acoustic droplet
      this.playWaterDrop(0.4 * duckFactor);
    }
  }

  /**
   * Water drop / ripple impulse
   */
  public playWaterDrop(amplitude: number = 0.6) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 420 + Math.random() * 260;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.7, t + 0.08); // pitch sweep up (bubble drop)

    const vol = 0.08 * amplitude;
    gainNode.gain.setValueAtTime(vol, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Stress release dissolve chime (crystal water granular chime)
   */
  public playWaterReleaseChime() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const baseTones = [528, 660, 792, 1056]; // Harmonics
    const t = this.ctx.currentTime;

    baseTones.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteDelay = idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + noteDelay);

      gain.gain.setValueAtTime(0, t + noteDelay);
      gain.gain.linearRampToValueAtTime(0.09, t + noteDelay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDelay + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + noteDelay);
      osc.stop(t + noteDelay + 1.3);
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const dsp = new DSPEngine();
