import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRippleImpact, pruneExpiredRipples, RippleSource } from './rippleMath';

test('ripple suppresses displacement when typing is active', () => {
  const ripples: RippleSource[] = [
    { id: '1', x: 100, y: 100, startTime: 1000, amplitude: 1.0 }
  ];
  const impact = calculateRippleImpact(150, 150, ripples, 1200, true);
  assert.equal(impact.dx, 0);
  assert.equal(impact.dy, 0);
  assert.equal(impact.trackingBoost, 0);
});

test('ripple pushes words radially outward in swell zone', () => {
  const ripples: RippleSource[] = [
    { id: '1', x: 100, y: 100, startTime: 1000, amplitude: 1.0 }
  ];
  // 0.3s later, wavefront is at 0.3 * 350 = 105px.
  // Word at (175, 100) is 75px to the right of tap point, close to wavefront.
  const impact = calculateRippleImpact(175, 100, ripples, 1250, false);
  // Word is directly to the right (angle = 0), so dx should be positive and dy should be ~0.
  assert.ok(impact.dx > 0, `Expected dx to be positive outward push, got ${impact.dx}`);
  assert.ok(Math.abs(impact.dy) < 0.1, `Expected dy to be near 0, got ${impact.dy}`);
});

test('inner zone produces micro-tracking expansion', () => {
  const ripples: RippleSource[] = [
    { id: '1', x: 200, y: 200, startTime: 1000, amplitude: 1.0 }
  ];
  // Word at 220, 200 (distance = 20px < 80px)
  const impact = calculateRippleImpact(220, 200, ripples, 1100, false);
  assert.ok(impact.trackingBoost > 0, `Expected tracking boost > 0, got ${impact.trackingBoost}`);
});

test('pruning removes old ripples', () => {
  const ripples: RippleSource[] = [
    { id: '1', x: 0, y: 0, startTime: 1000, amplitude: 1 },
    { id: '2', x: 0, y: 0, startTime: 3500, amplitude: 1 }
  ];
  const active = pruneExpiredRipples(ripples, 4000, 2000);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, '2');
});
