import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSolarAngle, getSolarPhase, getAtmosphericPalette } from './solarMath';

test('solar angle calculates reasonable values for noon and midnight', () => {
  const noon = new Date('2026-06-21T12:00:00Z');
  const angleNoon = calculateSolarAngle(noon, { latitude: 37.77, longitude: 0 });
  assert.ok(angleNoon > 40, `Noon solar angle should be high, got ${angleNoon}`);

  const midnight = new Date('2026-06-21T00:00:00Z');
  const angleMidnight = calculateSolarAngle(midnight, { latitude: 37.77, longitude: 0 });
  assert.ok(angleMidnight < 0, `Midnight solar angle should be negative, got ${angleMidnight}`);
});

test('solar phase maps accurately to elevation ranges', () => {
  assert.equal(getSolarPhase(40), 'daylight');
  assert.equal(getSolarPhase(15), 'goldenHour');
  assert.equal(getSolarPhase(2), 'dusk');
  assert.equal(getSolarPhase(-8), 'sunrise');
  assert.equal(getSolarPhase(-30), 'night');
});

test('atmospheric palettes provide correct pigment specifications', () => {
  const day = getAtmosphericPalette('daylight');
  assert.equal(day.canvasBg, '#FAF3EB');
  assert.equal(day.inkColor, '#1E1B18');

  const night = getAtmosphericPalette('night');
  assert.equal(night.canvasBg, '#0C0F14');
  assert.equal(night.inkColor, '#D8DCE3');

  const dynamicNoon = getAtmosphericPalette('dynamic', 50);
  assert.equal(dynamicNoon.phase, 'daylight');
  assert.ok(dynamicNoon.canvasBg.startsWith('#'));
});
