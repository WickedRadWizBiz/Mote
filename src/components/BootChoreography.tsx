/**
 * Cinematic Boot & Idle Lifecycle (". mote" Choreography)
 * Phase 1: Soft-focus floating period through volumetric light shafts
 * Phase 2: Settles at 30% down, light beam reveals "m", "o", "t", "e" -> ". mote"
 * Phase 3: "mote" dissolves, leaving ".", glides smoothly along bezier curve to document origin
 * Phase 4: Sister periods join -> breathing ellipsis (...) undulating in staggered sine wave
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SolarPalette } from '../utils/solarMath';

interface BootChoreographyProps {
  palette: SolarPalette;
  onComplete: () => void;
  autostart?: boolean;
}

export const BootChoreography: React.FC<BootChoreographyProps> = ({
  palette,
  onComplete,
  autostart = false,
}) => {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [skipped, setSkipped] = useState(false);
  const startTimeRef = useRef<number>(performance.now());
  const requestRef = useRef<number | null>(null);

  // Soft-focus float coordinates for Phase 1
  const [floatPos, setFloatPos] = useState({ x: 50, y: 45 });

  useEffect(() => {
    if (autostart) {
      onComplete();
      return;
    }

    // Animation timeline coordinator
    const t0 = performance.now();
    startTimeRef.current = t0;

    const animateLoop = (now: number) => {
      const elapsed = (now - t0) / 1000;

      if (elapsed < 1.8) {
        // Phase 1: organic drift
        const x = 50 + Math.sin(elapsed * 2.1) * 8 + Math.cos(elapsed * 1.3) * 6;
        const y = 45 + Math.cos(elapsed * 1.8) * 7 + Math.sin(elapsed * 0.9) * 5;
        setFloatPos({ x, y });
        setPhase(1);
      } else if (elapsed < 3.2) {
        // Phase 2: Settle at horizontal center, 30% from top (y: 30%)
        setPhase(2);
      } else if (elapsed < 4.2) {
        // Phase 3: "mote" dissolves, "." glides along curve to document origin
        setPhase(3);
      } else {
        // Phase 4: Breathing ellipsis
        setPhase(4);
        // Complete boot and hand off to main canvas after Phase 4 is established
        const timer = setTimeout(() => {
          onComplete();
        }, 1500);
        return () => clearTimeout(timer);
      }

      requestRef.current = requestAnimationFrame(animateLoop);
    };

    requestRef.current = requestAnimationFrame(animateLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [autostart, onComplete]);

  const handleSkip = () => {
    setSkipped(true);
    onComplete();
  };

  if (skipped || autostart) return null;

  return (
    <div
      role="region"
      aria-label="Mote Boot Choreography"
      onClick={handleSkip}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleSkip(); }}
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{
        background: palette.canvasBgGradient,
        color: palette.inkColor,
      }}
    >
      {/* Volumetric light shafts */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 25%, ${palette.accentColor} 0%, transparent 70%),
                       linear-gradient(${palette.lightAngleDeg}deg, rgba(255,255,255,0.08) 0%, transparent 60%)`,
        }}
      />

      {/* Floating period in Phase 1 */}
      {phase === 1 && (
        <motion.div
          className="absolute font-serif text-5xl select-none"
          style={{
            left: `${floatPos.x}%`,
            top: `${floatPos.y}%`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(1.5px)',
            opacity: 0.85,
            color: palette.inkColor,
          }}
          transition={{ ease: 'linear' }}
        >
          •
        </motion.div>
      )}

      {/* Phase 2: Settles at 30% from top, light beam reveals . mote */}
      {phase === 2 && (
        <div
          className="absolute flex items-baseline justify-center tracking-widest font-serif text-4xl sm:text-5xl"
          style={{
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: palette.inkColor,
          }}
        >
          <motion.span
            initial={{ scale: 0.8, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mr-3 font-mono text-3xl sm:text-4xl"
          >
            .
          </motion.span>
          <motion.div className="flex space-x-1.5 overflow-hidden relative">
            {['m', 'o', 't', 'e'].map((letter, idx) => (
              <motion.span
                key={letter + idx}
                initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.45,
                  delay: idx * 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-light lowercase"
              >
                {letter}
              </motion.span>
            ))}

            {/* Light beam sweep across */}
            <motion.div
              className="absolute inset-y-0 w-8 pointer-events-none"
              initial={{ left: '-20%' }}
              animate={{ left: '120%' }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              style={{
                background: `linear-gradient(90deg, transparent, ${palette.accentColor}, transparent)`,
                filter: 'blur(2px)',
              }}
            />
          </motion.div>
        </div>
      )}

      {/* Phase 3: "mote" dissolves, isolated "." glides to document starting coordinate */}
      {phase === 3 && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            initial={{ opacity: 0.9, top: '30%', left: '50%' }}
            animate={{
              opacity: 1,
              top: '18%',
              left: '12%',
            }}
            transition={{
              duration: 0.9,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="absolute font-mono text-3xl"
            style={{ color: palette.inkColor }}
          >
            .
          </motion.div>
        </div>
      )}

      {/* Phase 4: Breathing ellipsis */}
      {phase === 4 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-2 text-2xl font-mono" style={{ color: palette.inkColor }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{
                  opacity: [0.15, 0.9, 0.15],
                  scale: [0.95, 1.1, 0.95],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.45,
                  ease: 'easeInOut',
                }}
              >
                .
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Subtle skip cue in footer */}
      <div
        className="absolute bottom-8 text-xs font-sans tracking-widest uppercase opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: palette.inkMuted }}
      >
        tap anywhere to begin
      </div>
    </div>
  );
};
