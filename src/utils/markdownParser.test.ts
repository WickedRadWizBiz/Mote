import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImageDirective, parseMoteMarkdown } from './markdownParser';

test('parseImageDirective recognizes backdrop shorthand Z -1', () => {
  const line = '![hero landscape :: under, bleed, dim:40, blur:8, blend:diff](https://images.unsplash.com/photo-1)';
  const asset = parseImageDirective(line);
  assert.ok(asset !== null);
  assert.equal(asset.plane, -1);
  assert.equal(asset.bleed, true);
  assert.equal(asset.dim, 40);
  assert.equal(asset.blur, 8);
  assert.equal(asset.blendMode, 'difference');
  assert.equal(asset.alt, 'hero landscape');
});

test('parseImageDirective recognizes depth split Z +0.5 and overlay Z +1', () => {
  const depthLine = '![statue cutout :: depth, cutout:https://example.com/cutout.png](https://example.com/bg.jpg)';
  const depthAsset = parseImageDirective(depthLine);
  assert.ok(depthAsset !== null);
  assert.equal(depthAsset.plane, 0.5);
  assert.equal(depthAsset.depthSubjectCutout, 'https://example.com/cutout.png');

  const overLine = '![seal stamp :: over, dim:10](https://example.com/stamp.png)';
  const overAsset = parseImageDirective(overLine);
  assert.ok(overAsset !== null);
  assert.equal(overAsset.plane, 1);
  assert.equal(overAsset.dim, 10);
});

test('parseMoteMarkdown isolates slash commands and builds parsed document', () => {
  const doc = `
# The Architecture of Silence
/scrim radial
/blend mult
![bg :: under, bleed, dim:30](https://example.com/bg.jpg)
/clip SILENCE
The morning sun creeps over the basalt ledge.
  `.trim();

  const parsed = parseMoteMarkdown(doc);
  assert.equal(parsed.title, 'The Architecture of Silence');
  assert.equal(parsed.activeScrim, 'radial');
  assert.equal(parsed.activeBlend, 'multiply');
  assert.equal(parsed.backdropAssets.length, 1);
  assert.equal(parsed.clippedSections.length, 1);
  assert.equal(parsed.clippedSections[0].text, 'SILENCE');
  assert.equal(parsed.clippedSections[0].mode, 'clip');
});
