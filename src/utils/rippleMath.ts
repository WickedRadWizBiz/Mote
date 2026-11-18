/**
 * Surface Tension Typography (Water Ripple Physics)
 * Computes wave propagation and rigid-body word displacement using critically damped springs.
 */

export interface RippleSource {
  id: string;
  x: number;
  y: number;
  startTime: number;
  amplitude: number; // 0 to 1
}

export interface WordOffset {
  dx: number;
  dy: number;
  trackingBoost: number; // micro-glyph tracking expansion (em)
  opacityShift: number;
}

export const WAVE_SPEED_PX_PER_SEC = 350;
export const INNER_TRACKING_ZONE_PX = 80;
export const SWELL_ZONE_MAX_PX = 280;
export const MAX_DISPLACEMENT_PX = 4.5;
export const MIN_DISPLACEMENT_PX = 1.5;

/**
 * Calculates rigid-body displacement and tracking expansion for a word center (wx, wy)
 * at timestamp `now` caused by a set of active ripples.
 */
export function calculateRippleImpact(
  wx: number,
  wy: number,
  ripples: RippleSource[],
  now: number,
  isTypingSuppressed: boolean = false
): WordOffset {
  let totalDx = 0;
  let totalDy = 0;
  let totalTracking = 0;
  let totalOpacity = 0;

  if (isTypingSuppressed || ripples.length === 0) {
    return { dx: 0, dy: 0, trackingBoost: 0, opacityShift: 0 };
  }

  for (const ripple of ripples) {
    const elapsedSec = (now - ripple.startTime) / 1000;
    if (elapsedSec < 0 || elapsedSec > 2.5) continue; // Ripple dies after ~2.5s

    const waveRadius = elapsedSec * WAVE_SPEED_PX_PER_SEC;
    const dist = Math.hypot(wx - ripple.x, wy - ripple.y);

    // Distance to the moving wavefront
    const waveDist = Math.abs(dist - waveRadius);

    // Wave ring thickness (~60px)
    const waveRingWidth = 60;

    // Decay factor over time (critically damped exponential)
    const decay = Math.exp(-elapsedSec * 2.2) * ripple.amplitude;

    // 1. Inner zone tracking boost (micro-glyph expansion)
    if (dist < INNER_TRACKING_ZONE_PX && elapsedSec < 0.8) {
      const innerProximity = 1 - dist / INNER_TRACKING_ZONE_PX;
      totalTracking += innerProximity * 0.04 * decay;
    }

    // 2. Swell zone rigid-body displacement (80px to 280px)
    if (waveDist < waveRingWidth && dist <= SWELL_ZONE_MAX_PX) {
      const waveProfile = Math.cos((waveDist / waveRingWidth) * (Math.PI / 2));
      const distRatio = Math.max(0, 1 - dist / SWELL_ZONE_MAX_PX);
      const intensity = waveProfile * distRatio * decay;

      // Radial vector pointing away from tap point
      const angle = Math.atan2(wy - ripple.y, wx - ripple.x);
      const displacement = (MIN_DISPLACEMENT_PX + (MAX_DISPLACEMENT_PX - MIN_DISPLACEMENT_PX) * distRatio) * intensity;

      totalDx += Math.cos(angle) * displacement;
      totalDy += Math.sin(angle) * displacement;
      totalOpacity += intensity * 0.12;
    }
  }

  // Clamp max physical drift to avoid breaking layout boundaries
  const maxDisplacement = 6.0;
  const currentMagnitude = Math.hypot(totalDx, totalDy);
  if (currentMagnitude > maxDisplacement) {
    const factor = maxDisplacement / currentMagnitude;
    totalDx *= factor;
    totalDy *= factor;
  }

  return {
    dx: Number(totalDx.toFixed(3)),
    dy: Number(totalDy.toFixed(3)),
    trackingBoost: Number(totalTracking.toFixed(4)),
    opacityShift: Number(totalOpacity.toFixed(3)),
  };
}

/**
 * Filter out expired ripples (older than lifespan).
 */
export function pruneExpiredRipples(ripples: RippleSource[], now: number, maxAgeMs: number = 2500): RippleSource[] {
  return ripples.filter(r => now - r.startTime < maxAgeMs);
}
