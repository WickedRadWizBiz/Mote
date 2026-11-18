/**
 * Musical scales and physical modeling mappings for procedural DSP engine.
 */

// Note to Frequency (A4 = 440Hz)
export function noteToFreq(note: string, octave: number = 4): number {
  const noteNames: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11
  };

  // MIDI standard: C4 is note 60, A4 is note 69
  const midiNote = (octave + 1) * 12 + noteNames[note];
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Daylight: F Lydian (F, G, A, B, C, D, E)
export const F_LYDIAN = ['F', 'G', 'A', 'B', 'C', 'D', 'E'];

// Dusk: D Dorian (D, E, F, G, A, B, C)
export const D_DORIAN = ['D', 'E', 'F', 'G', 'A', 'B', 'C'];

// Night: A Aeolian Pentatonic (A, C, D, E, G)
export const A_AEOLIAN_PENTATONIC = ['A', 'C', 'D', 'E', 'G'];

export function getSolarScale(phase: 'daylight' | 'goldenHour' | 'dusk' | 'sunrise' | 'night'): {
  scale: string[];
  baseOctave: number;
  lpfCutoff: number;
  waveType: OscillatorType;
  binauralBaseFreq: number;
} {
  switch (phase) {
    case 'daylight':
    case 'goldenHour':
      return {
        scale: F_LYDIAN,
        baseOctave: 3,
        lpfCutoff: 650,
        waveType: 'triangle',
        binauralBaseFreq: 136.1, // Om frequency
      };
    case 'dusk':
    case 'sunrise':
      return {
        scale: D_DORIAN,
        baseOctave: 3,
        lpfCutoff: 450,
        waveType: 'sine',
        binauralBaseFreq: 108.0,
      };
    case 'night':
    default:
      return {
        scale: A_AEOLIAN_PENTATONIC,
        baseOctave: 2,
        lpfCutoff: 280,
        waveType: 'sine',
        binauralBaseFreq: 96.0,
      };
  }
}

/**
 * Keystroke acoustic physical modeling categorization.
 * Vowels -> Warm Rhodes / piano bell timbres
 * Consonants -> Resonant wooden marimba clicks
 * Space/Punctuation -> Soft hydro drop
 */
export type KeystrokeTimbre = 'vowel_rhodes' | 'consonant_marimba' | 'punct_drop';

export function categorizeChar(char: string): { timbre: KeystrokeTimbre; freq: number } {
  const lower = char.toLowerCase();
  const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];

  if (vowels.includes(lower)) {
    // Map vowels to melodic chord tones (E.g. F3 to C5)
    const vowelFreqs: Record<string, number> = {
      a: 220.0, // A3
      e: 261.63, // C4
      i: 329.63, // E4
      o: 392.00, // G4
      u: 196.00, // G3
      y: 440.00, // A4
    };
    return {
      timbre: 'vowel_rhodes',
      freq: vowelFreqs[lower] || 261.63,
    };
  }

  if (/[b-df-hj-np-tv-z]/.test(lower)) {
    // Consonant: marimba wood bar resonant pitch (180Hz - 600Hz)
    const code = lower.charCodeAt(0) - 97;
    const marimbaFreq = 200 + (code % 7) * 45;
    return {
      timbre: 'consonant_marimba',
      freq: marimbaFreq,
    };
  }

  // Punctuation, space, enter
  return {
    timbre: 'punct_drop',
    freq: 150,
  };
}
