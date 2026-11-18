import test from 'node:test';
import assert from 'node:assert/strict';
import { noteToFreq, getSolarScale, categorizeChar } from './scales';

test('noteToFreq computes accurate A4 and C4 frequencies', () => {
  const a4 = noteToFreq('A', 4);
  assert.equal(Math.round(a4), 440);

  const c4 = noteToFreq('C', 4);
  assert.equal(Math.round(c4), 262);
});

test('solar scales match PRD specifications for day, dusk, night', () => {
  const day = getSolarScale('daylight');
  assert.equal(day.lpfCutoff, 650);
  assert.equal(day.waveType, 'triangle');
  assert.deepEqual(day.scale, ['F', 'G', 'A', 'B', 'C', 'D', 'E']);

  const night = getSolarScale('night');
  assert.equal(night.lpfCutoff, 280);
  assert.equal(night.waveType, 'sine');
  assert.deepEqual(night.scale, ['A', 'C', 'D', 'E', 'G']);
});

test('character categorization properly separates vowels and consonants', () => {
  const vowel = categorizeChar('e');
  assert.equal(vowel.timbre, 'vowel_rhodes');
  assert.ok(vowel.freq > 200);

  const consonant = categorizeChar('k');
  assert.equal(consonant.timbre, 'consonant_marimba');
  assert.ok(consonant.freq >= 200);

  const space = categorizeChar(' ');
  assert.equal(space.timbre, 'punct_drop');
});
