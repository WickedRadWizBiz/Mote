/**
 * Text selection boundaries for word, sentence, and paragraph.
 * Supports hold-to-select word, double-tap to select sentence, triple-tap to select paragraph.
 */

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

/**
 * Finds the word boundaries around a character index in a string.
 */
export function getWordAtOffset(text: string, offset: number): TextRange {
  if (text.length === 0) return { start: 0, end: 0, text: '' };
  const safeOffset = Math.max(0, Math.min(text.length - 1, offset));

  // If clicking on whitespace, find closest word or return empty
  let start = safeOffset;
  let end = safeOffset;

  const isWordChar = (ch: string) => /[\p{L}\p{N}_'-]/u.test(ch);

  // If clicked directly on a non-word char, look one step left/right
  if (!isWordChar(text[safeOffset])) {
    if (safeOffset > 0 && isWordChar(text[safeOffset - 1])) {
      start = safeOffset - 1;
      end = safeOffset - 1;
    } else if (safeOffset < text.length - 1 && isWordChar(text[safeOffset + 1])) {
      start = safeOffset + 1;
      end = safeOffset + 1;
    } else {
      return { start: safeOffset, end: safeOffset, text: '' };
    }
  }

  while (start > 0 && isWordChar(text[start - 1])) {
    start--;
  }

  while (end < text.length - 1 && isWordChar(text[end + 1])) {
    end++;
  }

  end = end + 1; // exclusive slice
  return {
    start,
    end,
    text: text.slice(start, end),
  };
}

/**
 * Finds the sentence boundaries around a character index.
 * Delimited by '.', '!', '?', or newlines.
 */
export function getSentenceAtOffset(text: string, offset: number): TextRange {
  if (text.length === 0) return { start: 0, end: 0, text: '' };
  const safeOffset = Math.max(0, Math.min(text.length - 1, offset));

  let start = safeOffset;
  let end = safeOffset;

  // Move backward to sentence start
  while (start > 0) {
    const prevChar = text[start - 1];
    if (prevChar === '\n') break;
    if (/[.!?]/.test(prevChar) && start <= safeOffset) {
      // Check if after punctuation
      break;
    }
    start--;
  }

  // Trim leading whitespace for start
  while (start < safeOffset && /\s/.test(text[start])) {
    start++;
  }

  // Move forward to sentence end
  while (end < text.length) {
    const ch = text[end];
    if (ch === '\n') break;
    if (/[.!?]/.test(ch)) {
      end++; // Include the punctuation
      break;
    }
    end++;
  }

  return {
    start,
    end,
    text: text.slice(start, end).trim(),
  };
}

/**
 * Finds paragraph boundaries around a character index.
 * Delimited by double newlines or document boundaries.
 */
export function getParagraphAtOffset(text: string, offset: number): TextRange {
  if (text.length === 0) return { start: 0, end: 0, text: '' };
  const safeOffset = Math.max(0, Math.min(text.length - 1, offset));

  let start = safeOffset;
  let end = safeOffset;

  // Move backward to paragraph start (double newline or 0)
  while (start > 0) {
    if (text[start] === '\n' && text[start - 1] === '\n') {
      start++; // After the double newline
      break;
    }
    start--;
  }

  // Move forward to paragraph end
  while (end < text.length) {
    if (text[end] === '\n' && end < text.length - 1 && text[end + 1] === '\n') {
      break;
    }
    end++;
  }

  return {
    start,
    end,
    text: text.slice(start, end).trim(),
  };
}
