/**
 * Liquid Hydrodynamics & Caustic Canvas for Mote
 * Emits radial wave rings on tap, handles caustics, floating word buoys,
 * and dissolving thoughts for Water Release.
 */

import React, { useRef, useEffect } from 'react';
import { RippleSource, pruneExpiredRipples, WAVE_SPEED_PX_PER_SEC } from '../utils/rippleMath';
import { SolarPalette } from '../utils/solarMath';

export interface FloatingBuoy {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
}

export interface DissolvingThought {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    char: string;
    opacity: number;
    life: number;
  }>;
}

interface WaterRippleCanvasProps {
  palette: SolarPalette;
  ripples: RippleSource[];
  onAddRipple: (ripple: RippleSource) => void;
  floatingBuoys?: FloatingBuoy[];
  onUpdateBuoyPosition?: (id: string, x: number, y: number) => void;
  dissolvingThoughts?: DissolvingThought[];
}

export const WaterRippleCanvas: React.FC<WaterRippleCanvasProps> = ({
  palette,
  ripples,
  onAddRipple,
  floatingBuoys = [],
  onUpdateBuoyPosition,
  dissolvingThoughts = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.parentElement?.clientWidth ? canvas.parentElement.clientWidth * dpr : window.innerWidth * dpr;
      canvas.height = canvas.parentElement?.clientHeight ? canvas.parentElement.clientHeight * dpr : window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;
      const now = performance.now();

      ctx.clearRect(0, 0, width, height);

      // 1. Draw expanding radial wave caustics
      for (const ripple of ripples) {
        const elapsedSec = (now - ripple.startTime) / 1000;
        if (elapsedSec > 2.5) continue;

        const currentRadius = elapsedSec * WAVE_SPEED_PX_PER_SEC;
        const decay = Math.exp(-elapsedSec * 2.2) * ripple.amplitude;

        // Outer wave ring
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = palette.mode === 'night'
          ? `rgba(180, 210, 255, ${0.15 * decay})`
          : `rgba(226, 184, 135, ${0.25 * decay})`;
        ctx.lineWidth = Math.max(1, 3.5 * decay);
        ctx.stroke();

        // Secondary subtle inner swell ring
        if (currentRadius > 35) {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, Math.max(1, currentRadius - 25), 0, Math.PI * 2);
          ctx.strokeStyle = palette.mode === 'night'
            ? `rgba(120, 160, 220, ${0.08 * decay})`
            : `rgba(240, 210, 170, ${0.12 * decay})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Inner micro-glyph impulse circle
        if (elapsedSec < 0.4) {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, Math.min(80, currentRadius * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = palette.mode === 'night'
            ? `rgba(100, 150, 240, ${0.04 * (1 - elapsedSec / 0.4)})`
            : `rgba(240, 220, 190, ${0.06 * (1 - elapsedSec / 0.4)})`;
          ctx.fill();
        }
      }

      // 2. Render Dissolving Thoughts (Water Release)
      for (const thought of dissolvingThoughts) {
        const elapsed = (now - thought.startTime) / 1000;
        for (const p of thought.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.05; // slight upward flotation like vapor/bubbles
          p.opacity = Math.max(0, 1 - elapsed / p.life);

          if (p.opacity > 0) {
            ctx.font = 'italic 16px Newsreader, serif';
            ctx.fillStyle = palette.mode === 'night'
              ? `rgba(216, 220, 227, ${p.opacity})`
              : `rgba(30, 27, 24, ${p.opacity})`;
            ctx.fillText(p.char, p.x, p.y);

            // Shimmer dot next to character
            ctx.beginPath();
            ctx.arc(p.x + 8, p.y - 4, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(226, 184, 135, ${p.opacity * 0.7})`;
            ctx.fill();
          }
        }
      }

      // 3. Render Floating Word Buoys (Drift Mode)
      for (const buoy of floatingBuoys) {
        // Natural water current drift
        buoy.x += buoy.vx;
        buoy.y += buoy.vy;

        // Soft bounce against boundaries
        if (buoy.x < 40 || buoy.x > width - 120) buoy.vx *= -0.9;
        if (buoy.y < 40 || buoy.y > height - 60) buoy.vy *= -0.9;

        // Wave bobbing
        const bob = Math.sin(now * 0.002 + buoy.x * 0.01) * 2;

        ctx.font = '500 13px Newsreader, serif';
        const metrics = ctx.measureText(buoy.text);
        const padX = 14;
        const padY = 6;
        const pillW = metrics.width + padX * 2;
        const pillH = 26;

        // Draw delicate water buoy container
        ctx.fillStyle = palette.mode === 'night'
          ? 'rgba(26, 34, 48, 0.65)'
          : 'rgba(255, 250, 244, 0.75)';
        ctx.strokeStyle = palette.mode === 'night'
          ? 'rgba(100, 130, 180, 0.3)'
          : 'rgba(210, 175, 135, 0.4)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(buoy.x - padX, buoy.y - pillH / 2 + bob, pillW, pillH, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = palette.inkColor;
        ctx.fillText(buoy.text, buoy.x, buoy.y + 4 + bob);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [ripples, palette, dissolvingThoughts, floatingBuoys]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: RippleSource = {
      id: `rip-${Date.now()}-${Math.random()}`,
      x,
      y,
      startTime: performance.now(),
      amplitude: 1.0,
    };

    onAddRipple(newRipple);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
};
