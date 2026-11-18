import test from 'node:test';
import assert from 'node:assert/strict';
import { getWordAtOffset, getSentenceAtOffset, getParagraphAtOffset } from './textSelection';

test('getWordAtOffset accurately selects word at character index', () => {
  const text = 'Space in classical typography was never empty.';
  const word = getWordAtOffset(text, 12); // inside "classical"
  assert.equal(word.text, 'classical');
  assert.equal(word.start, 9);
  assert.equal(word.end, 18);
});

test('getSentenceAtOffset accurately selects whole sentence at character index', () => {
  const text = 'First sentence here. Space in classical typography was never empty! Final sentence.';
  const sentence = getSentenceAtOffset(text, 35);
  assert.equal(sentence.text, 'Space in classical typography was never empty!');
});

test('getParagraphAtOffset accurately selects paragraph between double newlines', () => {
  const text = `Paragraph one begins here and ends here.\n\nParagraph two is selected when triple tapped.\n\nParagraph three.`;
  const para = getParagraphAtOffset(text, 55);
  assert.equal(para.text, 'Paragraph two is selected when triple tapped.');
});
