/**
 * Procedural Meditation Architecture for Mote
 * Stillness Mode (Stress Relief & Neutral Somatic Scan & Water Release)
 * Drift Mode (Brainstorming & Floating Word Buoys & Inner Critic Fog)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { dsp } from '../audio/dspEngine';
import { SolarPalette } from '../utils/solarMath';
import { FloatingBuoy, DissolvingThought } from './WaterRippleCanvas';

export type MeditationMode = 'off' | 'stillness' | 'drift';

interface MeditationOverlayProps {
  palette: SolarPalette;
  mode: MeditationMode;
  onChangeMode: (mode: MeditationMode) => void;
  onAddDissolvingThought: (thought: DissolvingThought) => void;
  onAddFloatingBuoy: (text: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const SOMATIC_STEPS = [
  'Notice how your body feels, starting from your head, moving down to your neck, jaw, and shoulders.',
  'Acknowledging how it feels as you scan from your shoulders to your back and hips, legs, calves, and feet.',
  'Observe your body resting as a whole, simply noticing the rhythm of your breath moving in and out.',
];

export const MeditationOverlay: React.FC<MeditationOverlayProps> = ({
  palette,
  mode,
  onChangeMode,
  onAddDissolvingThought,
  onAddFloatingBuoy,
  isMuted,
  onToggleMute,
}) => {
  // Somatic step tracking (0, 1, 2)
  const [somaticIndex, setSomaticIndex] = useState(0);

  // Water Release input
  const [releaseInput, setReleaseInput] = useState('');

  // Drift mode new buoy input
  const [buoyInput, setBuoyInput] = useState('');

  // Breath cycle animation (0 to 1)
  const [breathRatio, setBreathRatio] = useState(0.5);

  useEffect(() => {
    dsp.setMeditationMode(mode);

    if (mode === 'stillness') {
      let startTime = performance.now();
      let animId: number;

      const breathLoop = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        // 5.5 second breath cycle (sine wave normalized to 0..1)
        const cycle = Math.sin((elapsed / 5.5) * Math.PI * 2);
        const ratio = (cycle + 1) / 2;
        setBreathRatio(ratio);
        dsp.updateBreathPhysics(ratio);

        animId = requestAnimationFrame(breathLoop);
      };

      animId = requestAnimationFrame(breathLoop);
      return () => cancelAnimationFrame(animId);
    }
  }, [mode]);

  // Advance somatic scan step every 18 seconds
  useEffect(() => {
    if (mode !== 'stillness') return;
    const interval = setInterval(() => {
      setSomaticIndex((prev) => (prev + 1) % SOMATIC_STEPS.length);
    }, 18000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleWaterRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseInput.trim()) return;

    // Trigger crystal chime audio
    dsp.playWaterReleaseChime();

    // Create dissolving thought particles
    const chars = releaseInput.split('');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const thought: DissolvingThought = {
      id: `thought-${Date.now()}`,
      text: releaseInput,
      x: centerX,
      y: centerY,
      startTime: performance.now(),
      particles: chars.map((char, i) => ({
        x: centerX - (chars.length * 9) / 2 + i * 14,
        y: centerY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.8 - Math.random() * 1.2,
        char,
        opacity: 1,
        life: 2.8,
      })),
    };

    onAddDissolvingThought(thought);
    setReleaseInput('');
  };

  const handleAddBuoy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buoyInput.trim()) return;
    dsp.playWaterDrop(0.8);
    onAddFloatingBuoy(buoyInput.trim());
    setBuoyInput('');
  };

  return (
    <>
      {/* STILLNESS MODE HUD & SOMATIC SCAN */}
      <AnimatePresence>
        {mode === 'stillness' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-x-0 top-14 z-30 pointer-events-none flex flex-col items-center justify-start px-6"
          >
            {/* Breathing . mote Indicator */}
            <div className="flex flex-col items-center space-y-2 mb-4">
              <div
                className="w-8 h-8 rounded-full border border-amber-500/40 flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `scale(${0.8 + breathRatio * 0.4})`,
                  borderColor: palette.accentColor,
                  boxShadow: `0 0 20px ${palette.accentColor}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: palette.inkColor, opacity: 0.4 + breathRatio * 0.5 }}
                />
              </div>
              <div className="text-[10px] font-mono tracking-widest uppercase opacity-50">
                {breathRatio > 0.5 ? 'inhale · expansion' : 'exhale · release'} · Theta 6.0Hz
              </div>
            </div>

            {/* Neutral Top-Down Somatic Scan Whispering Typography */}
            <motion.div
              key={somaticIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 1.2 }}
              className="max-w-xl text-center px-4 py-2 font-serif italic text-base sm:text-lg opacity-80"
              style={{ color: palette.inkColor }}
            >
              "{SOMATIC_STEPS[somaticIndex]}"
            </motion.div>

            {/* Water Release: Type stressful thoughts to dissolve */}
            <div className="pointer-events-auto mt-6 w-full max-w-md">
              <form onSubmit={handleWaterRelease} className="relative flex items-center">
                <input
                  type="text"
                  value={releaseInput}
                  onChange={(e) => setReleaseInput(e.target.value)}
                  placeholder="Cast a thought into the water to dissolve..."
                  aria-label="Cast a thought into the water to dissolve"
                  className="w-full px-4 py-2 text-sm font-serif italic bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full outline-none focus:border-amber-500/50 pr-24 transition-colors"
                  style={{ color: palette.inkColor }}
                />
                <button
                  type="submit"
                  aria-label="Release thought into water"
                  className="absolute right-1.5 px-3 py-1 text-xs font-mono uppercase bg-amber-500/20 hover:bg-amber-500/30 rounded-full transition-colors cursor-pointer"
                  style={{ color: palette.inkColor }}
                >
                  Release
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRIFT MODE HUD & FLOATING WORD BUOYS */}
      <AnimatePresence>
        {mode === 'drift' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed top-14 inset-x-0 z-30 pointer-events-none flex flex-col items-center justify-start px-6"
          >
            <div className="text-[11px] font-mono tracking-widest uppercase opacity-60 mb-2">
              Drift Mode · Alpha 10.5Hz · Inner Critic Silenced
            </div>

            {/* Add Floating Word Buoy */}
            <div className="pointer-events-auto w-full max-w-sm">
              <form onSubmit={handleAddBuoy} className="relative flex items-center">
                <input
                  type="text"
                  value={buoyInput}
                  onChange={(e) => setBuoyInput(e.target.value)}
                  placeholder="Drop a floating idea buoy..."
                  aria-label="Drop a floating idea buoy"
                  className="w-full px-4 py-1.5 text-xs font-serif bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full outline-none focus:border-sky-500/50 pr-20 transition-colors"
                  style={{ color: palette.inkColor }}
                />
                <button
                  type="submit"
                  aria-label="Float buoy on canvas"
                  className="absolute right-1 px-3 py-1 text-[10px] font-mono uppercase bg-sky-500/20 hover:bg-sky-500/30 rounded-full transition-colors cursor-pointer"
                  style={{ color: palette.inkColor }}
                >
                  Float
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
