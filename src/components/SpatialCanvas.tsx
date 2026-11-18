/**
 * Z-Axis Spatial Canvas & InDesign Publishing Engine for Mote
 * Coordinates Z -1 (Backdrop), Z 0 (Prose with Columns & Surface Tension),
 * Z +0.5 (Depth Split with Cutout), and Z +1 (Overlays & Stamps).
 *
 * Implements user's exact selection & editing specifications:
 * - Hold on word -> selects word
 * - Double tap -> selects sentence
 * - Triple tap -> selects paragraph
 * - Direct in-place editing with live procedural keystroke acoustics.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { ParsedDocument, ZPlane, ClippedTextDirective } from '../utils/markdownParser';
import { SolarPalette } from '../utils/solarMath';
import { ColumnMode, BaselineGrid, TypographySettings } from './MoteBar';
import { RippleSource, calculateRippleImpact } from '../utils/rippleMath';
import { getWordAtOffset, getSentenceAtOffset, getParagraphAtOffset } from '../utils/textSelection';

interface SpatialCanvasProps {
  parsedDoc: ParsedDocument;
  rawText: string;
  onChangeRawText: (text: string) => void;
  palette: SolarPalette;
  activeZPlane: ZPlane;
  columnMode: ColumnMode;
  baselineGrid: BaselineGrid;
  typography: TypographySettings;
  ripples: RippleSource[];
  isTyping: boolean;
  onKeystroke: (char: string) => void;
  foggedInkMode?: boolean; // Drift mode: dims older text to silence inner critic
  isMeditationActive?: boolean;
  onAddRipple?: (ripple: RippleSource) => void;
}

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({
  parsedDoc,
  rawText,
  onChangeRawText,
  palette,
  activeZPlane,
  columnMode,
  baselineGrid,
  typography,
  ripples,
  isTyping,
  onKeystroke,
  foggedInkMode = false,
  isMeditationActive = false,
  onAddRipple,
}) => {
  // Pan-inside-glyph state for /clip and /punch
  const [clipPan, setClipPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanningClip, setIsPanningClip] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number } | null>(null);

  // Edit mode vs Reading/Layout preview mode
  const [isRawEdit, setIsRawEdit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Gesture feedback badge
  const [selectionBadge, setSelectionBadge] = useState<string | null>(null);
  const badgeTimerRef = useRef<number | null>(null);

  // Gesture tracking refs for Hold on word, double-tap sentence, triple-tap paragraph
  const holdTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const tapHistoryRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Split raw text lines for rigid-body water displacement calculation
  const proseParagraphs = useMemo(() => {
    return parsedDoc.proseMarkdown
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [parsedDoc.proseMarkdown]);

  // Baseline grid line-height in pixels
  const baselinePx = baselineGrid === '8pt' ? 16 : baselineGrid === '12pt' ? 24 : baselineGrid === '16pt' ? 32 : 0;

  const showBadge = (text: string) => {
    setSelectionBadge(text);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = window.setTimeout(() => setSelectionBadge(null), 1800);
  };

  const triggerHaptic = (ms: number = 14) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Fallback
      }
    }
  };

  // Helper to find caret offset from pointer coordinates inside an element
  const getCaretOffset = (el: HTMLElement, clientX: number, clientY: number): number => {
    if (typeof document === 'undefined') return 0;

    // Standard caretRangeFromPoint
    if ('caretRangeFromPoint' in document) {
      // @ts-ignore
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range && el.contains(range.startContainer)) {
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        return preRange.toString().length;
      }
    }

    // Firefox caretPositionFromPoint
    if ('caretPositionFromPoint' in document) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode && el.contains(pos.offsetNode)) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.setEnd(pos.offsetNode, pos.offset);
        return range.toString().length;
      }
    }

    return 0;
  };

  // Helper to select a character range [start, end] inside an element
  const setSelectionRange = (el: HTMLElement, start: number, end: number) => {
    const selection = window.getSelection();
    if (!selection) return;

    let charCount = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode) {
      const textLen = textNode.textContent?.length || 0;
      const nextCharCount = charCount + textLen;

      if (!startNode && start >= charCount && start <= nextCharCount) {
        startNode = textNode;
        startOffset = start - charCount;
      }
      if (!endNode && end >= charCount && end <= nextCharCount) {
        endNode = textNode;
        endOffset = end - charCount;
      }

      charCount = nextCharCount;
      textNode = walker.nextNode();
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
      range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0));
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // =========================================================================
  // GESTURE HANDLERS (Hold on word, double-tap sentence, triple-tap paragraph)
  // =========================================================================

  const handleParagraphPointerDown = (pIdx: number, e: React.PointerEvent<HTMLParagraphElement>) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    const targetEl = e.currentTarget;

    pointerStartRef.current = { x: clientX, y: clientY, time: performance.now() };

    // Clear any existing hold timer
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    // Start 380ms hold timer for word selection
    holdTimerRef.current = window.setTimeout(() => {
      const text = targetEl.innerText || '';
      const offset = getCaretOffset(targetEl, clientX, clientY);
      const word = getWordAtOffset(text, offset);

      if (word.text) {
        setSelectionRange(targetEl, word.start, word.end);
        triggerHaptic(14);
        showBadge(`Word selected: "${word.text}"`);
      }
    }, 380);
  };

  const handleParagraphPointerMove = (e: React.PointerEvent<HTMLParagraphElement>) => {
    if (!pointerStartRef.current) return;
    const dist = Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y);
    if (dist > 8) {
      // User is scrolling or moving, cancel hold
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
  };

  const handleParagraphPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Double tap / Triple tap detection
  const handleParagraphClick = (pIdx: number, e: React.MouseEvent<HTMLParagraphElement>) => {
    const now = performance.now();
    const timeSinceLast = now - tapHistoryRef.current.lastTime;
    const targetEl = e.currentTarget;
    const text = targetEl.innerText || '';

    let newCount = 1;
    if (timeSinceLast < 400) {
      newCount = tapHistoryRef.current.count + 1;
    }
    tapHistoryRef.current = { count: newCount, lastTime: now };

    if (newCount === 2) {
      // Double tap -> Select sentence!
      const offset = getCaretOffset(targetEl, e.clientX, e.clientY);
      const sentence = getSentenceAtOffset(text, offset);

      if (sentence.text) {
        setSelectionRange(targetEl, sentence.start, sentence.end);
        triggerHaptic(18);
        showBadge('Sentence selected');
      }
    } else if (newCount >= 3) {
      // Triple tap -> Select paragraph!
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(targetEl);
        selection.removeAllRanges();
        selection.addRange(range);
        triggerHaptic(25);
        showBadge('Paragraph selected');
      }
      tapHistoryRef.current = { count: 0, lastTime: 0 };
    }
  };

  // Handle direct in-place editing of paragraphs in formatted view
  const handleParagraphInput = (pIdx: number, newParaText: string) => {
    const updatedParagraphs = [...proseParagraphs];
    updatedParagraphs[pIdx] = newParaText;

    // Reconstruct raw document while preserving directives (/scrim, /blend, ![...], /clip)
    const lines = rawText.split('\n');
    const directives: string[] = [];
    for (const l of lines) {
      const trimmed = l.trim();
      if (
        trimmed.startsWith('# ') ||
        trimmed.startsWith('/scrim') ||
        trimmed.startsWith('/blend') ||
        trimmed.startsWith('/clip') ||
        trimmed.startsWith('/punch') ||
        trimmed.startsWith('![')
      ) {
        directives.push(l);
      }
    }

    const reconstructed = `${directives.join('\n')}\n\n${updatedParagraphs.join('\n\n')}`;
    onChangeRawText(reconstructed);
  };

  const handleParagraphKeyDown = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
    onKeystroke(e.key);
  };

  // Handle Pan-Inside-Glyph
  const handlePanStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanningClip(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: clipPan.x,
      startPanY: clipPan.y,
    };
  };

  const handlePanMove = (e: React.PointerEvent) => {
    if (!isPanningClip || !panStartRef.current) return;
    const dx = ((e.clientX - panStartRef.current.clientX) / 250) * 100;
    const dy = ((e.clientY - panStartRef.current.clientY) / 250) * 100;

    setClipPan({
      x: Math.max(0, Math.min(100, panStartRef.current.startPanX + dx)),
      y: Math.max(0, Math.min(100, panStartRef.current.startPanY + dy)),
    });
  };

  const handlePanEnd = () => {
    setIsPanningClip(false);
    panStartRef.current = null;
  };

  // Raw editor text change
  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const diffChar = newText.length > rawText.length ? newText[newText.length - 1] : ' ';
    onKeystroke(diffChar);
    onChangeRawText(newText);
  };

  // Background pointer down emits water ripple
  const handleCanvasBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only emit ripple if clicking background canvas, not on an editable paragraph or button
    const target = e.target as HTMLElement;
    if (
      target.isContentEditable ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON'
    ) {
      return;
    }

    if (onAddRipple && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onAddRipple({
        id: `rip-bg-${Date.now()}-${Math.random()}`,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        startTime: performance.now(),
        amplitude: 1.0,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleCanvasBackgroundPointerDown}
      className="relative w-full h-full min-h-screen overflow-x-hidden overflow-y-auto pb-28 transition-colors duration-500 select-text"
      style={{
        background: palette.canvasBgGradient,
        color: palette.inkColor,
      }}
    >
      {/* Floating gesture selection feedback pill */}
      {selectionBadge && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full text-xs font-mono font-medium shadow-lg backdrop-blur-md animate-fade-in pointer-events-none"
          style={{
            background: palette.mode === 'night' ? 'rgba(30, 40, 56, 0.95)' : 'rgba(255, 248, 238, 0.95)',
            border: `1px solid ${palette.accentColor}`,
            color: palette.inkColor,
          }}
        >
          {selectionBadge}
        </div>
      )}

      {/* =========================================================================
          BASELINE GRID GUIDE LINES (8pt / 12pt / 16pt)
          ========================================================================= */}
      {baselineGrid !== 'off' && baselinePx > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${
              palette.mode === 'night' ? 'rgba(100, 140, 200, 0.07)' : 'rgba(180, 120, 80, 0.08)'
            } 1px, transparent 1px)`,
            backgroundSize: `100% ${baselinePx}px`,
          }}
        />
      )}

      {/* =========================================================================
          Z-AXIS PLANE -1: BACKDROP (Under)
          Full-bleed images, textures, ambient washes, scrims & blend modes
          ========================================================================= */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300"
        style={{
          zIndex: 1,
          opacity: activeZPlane === -1 ? 1 : 0.85,
        }}
      >
        {/* Full-bleed background images */}
        {parsedDoc.backdropAssets.map((asset) => (
          <div
            key={asset.id}
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${asset.url})`,
              opacity: (100 - asset.dim) / 100,
              filter: asset.blur ? `blur(${asset.blur}px)` : 'none',
              mixBlendMode: asset.blendMode,
            }}
          />
        ))}

        {/* Dynamic Scrim Overlays (/scrim [top | bottom | radial]) */}
        {parsedDoc.activeScrim === 'top' && (
          <div
            className="absolute inset-x-0 top-0 h-96 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${palette.canvasBg} 0%, transparent 100%)`,
            }}
          />
        )}
        {parsedDoc.activeScrim === 'bottom' && (
          <div
            className="absolute inset-x-0 bottom-0 h-96 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${palette.canvasBg} 0%, transparent 100%)`,
            }}
          />
        )}
        {parsedDoc.activeScrim === 'radial' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, transparent 20%, ${palette.canvasBg} 90%)`,
            }}
          />
        )}
      </div>

      {/* =========================================================================
          Z-AXIS PLANE +0.5: DEPTH SPLIT
          Places large title / headings behind a photo's foreground subject while
          keeping body text in front.
          ========================================================================= */}
      {parsedDoc.depthSplitAssets.length > 0 && (
        <div className="relative z-10 w-full max-w-4xl mx-auto pt-16 px-6 pointer-events-none">
          <div className="relative overflow-hidden py-10">
            <h1
              className="text-6xl sm:text-7xl font-serif font-light tracking-tight text-center select-none"
              style={{
                color: palette.mode === 'night' ? 'rgba(216, 220, 227, 0.45)' : 'rgba(30, 27, 24, 0.35)',
                letterSpacing: `${typography.tracking}em`,
              }}
            >
              {parsedDoc.title}
            </h1>

            <div
              className="absolute inset-0 flex items-center justify-center opacity-85"
              style={{
                mixBlendMode: parsedDoc.activeBlend,
              }}
            >
              <div
                className="w-72 h-48 bg-cover bg-center rounded-lg shadow-2xl border border-black/10"
                style={{
                  backgroundImage: `url(${parsedDoc.depthSplitAssets[0].url})`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Z-AXIS PLANE 0: PROSE / INLINE (Active Writing & Publishing Layer)
          Threaded InDesign columns, Baseline Grid snap, Surface tension word drift,
          Live /clip and /punch typography masks.
          ========================================================================= */}
      <main
        className={`relative z-20 w-full max-w-5xl mx-auto px-6 sm:px-12 transition-all duration-500 ${
          isMeditationActive ? 'pt-64 sm:pt-60' : 'pt-14 sm:pt-16'
        }`}
        style={{
          fontFamily: 'Newsreader, Georgia, serif',
          letterSpacing: `${typography.tracking}em`,
          lineHeight: typography.leading,
          fontWeight: typography.weight,
        }}
      >
        {/* Toggle between InDesign Formatted View and Direct Markdown Raw Editor */}
        <div className="flex justify-between items-center mb-4 font-mono text-xs opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-[10px] uppercase tracking-wider opacity-60">
            Hold word · Double-tap sentence · Triple-tap para · Click to edit
          </span>
          <button
            type="button"
            onClick={() => setIsRawEdit(!isRawEdit)}
            aria-label={isRawEdit ? 'Switch to InDesign Formatted Preview' : 'Switch to Raw Markdown Editor'}
            className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 uppercase tracking-widest cursor-pointer"
          >
            {isRawEdit ? 'Formatted View' : 'Raw Edit'}
          </button>
        </div>

        {/* LIVE GLYPH CLIPPING (/clip) OR KNOCKOUT PUNCH (/punch) */}
        {parsedDoc.clippedSections.map((clip, idx) => (
          <div
            key={idx}
            className="my-8 text-center relative group"
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
          >
            <div className="text-[10px] font-mono tracking-widest uppercase opacity-40 mb-1 select-none">
              {clip.mode === 'clip' ? 'Live /clip (drag to pan texture inside glyphs)' : 'Live /punch (stencil knockout window)'}
            </div>

            {clip.mode === 'clip' ? (
              <div
                className="text-5xl sm:text-7xl font-serif font-black tracking-widest uppercase inline-block cursor-grab active:cursor-grabbing transition-transform duration-75 select-text"
                style={{
                  backgroundImage: `url(${
                    parsedDoc.backdropAssets[0]?.url ||
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80'
                  })`,
                  backgroundPosition: `${clipPan.x}% ${clipPan.y}%`,
                  backgroundSize: '200%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 16px rgba(0,0,0,0.06)',
                }}
              >
                {clip.text}
              </div>
            ) : (
              <div
                className="relative inline-block px-10 py-6 rounded-xl border border-black/10 shadow-lg overflow-hidden select-text"
                style={{
                  background: palette.mode === 'night' ? '#181E29' : '#EDE2D4',
                }}
              >
                <div
                  className="text-4xl sm:text-6xl font-serif font-extrabold tracking-widest uppercase"
                  style={{
                    color: palette.canvasBg,
                    mixBlendMode: 'difference',
                  }}
                >
                  {clip.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* INLINE WRITING / PROSE SECTION */}
        {isRawEdit ? (
          /* Live Direct Markdown Textarea */
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={handleRawTextChange}
              rows={18}
              aria-label="Mote document prose content"
              placeholder="Begin typing here in silence..."
              className="w-full bg-transparent resize-none border-none outline-none focus:outline-none focus:ring-0 p-0 selection:bg-amber-500/30"
              style={{
                fontFamily: 'Newsreader, Georgia, serif',
                fontSize: `${typography.fontSize || 19}px`,
                letterSpacing: `${typography.tracking}em`,
                lineHeight: typography.leading,
                fontWeight: typography.weight,
                color: palette.inkColor,
              }}
            />
          </div>
        ) : (
          /* InDesign Column Layout: 1-col, 2-col, or Golden Ratio 62/38 with surface tension drift,
             direct contentEditable, and hold/double-tap/triple-tap selection */
          <div
            className={`w-full transition-all duration-300 ${
              columnMode === '1-col'
                ? 'max-w-2xl mx-auto'
                : columnMode === '2-col'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
                : 'grid grid-cols-1 md:grid-cols-[62fr_38fr] gap-10'
            }`}
          >
            {/* Primary Threaded Column */}
            <div className="space-y-6">
              {proseParagraphs.slice(0, columnMode === '1-col' ? undefined : Math.ceil(proseParagraphs.length / 2)).map((para, pIdx) => {
                const estX = 350;
                const estY = 200 + pIdx * 90;
                const impact = calculateRippleImpact(estX, estY, ripples, performance.now(), isTyping);

                const isFirstPara = pIdx === 0 && typography.dropCap;
                const dropCapChar = isFirstPara && para.length > 0 ? para[0] : null;
                const restPara = dropCapChar ? para.slice(1) : para;

                return (
                  <p
                    key={pIdx}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onPointerDown={(e) => handleParagraphPointerDown(pIdx, e)}
                    onPointerMove={handleParagraphPointerMove}
                    onPointerUp={handleParagraphPointerUp}
                    onPointerCancel={handleParagraphPointerUp}
                    onClick={(e) => handleParagraphClick(pIdx, e)}
                    onInput={(e) => handleParagraphInput(pIdx, e.currentTarget.innerText)}
                    onKeyDown={handleParagraphKeyDown}
                    className={`transition-transform duration-100 ease-out text-justify outline-none focus:outline-none cursor-text select-text ${
                      foggedInkMode && pIdx < proseParagraphs.length - 1 ? 'opacity-20' : 'opacity-100'
                    }`}
                    style={{
                      transform: `translate3d(${impact.dx}px, ${impact.dy}px, 0)`,
                      letterSpacing: `${typography.tracking + impact.trackingBoost}em`,
                      fontSize: `${typography.fontSize || 19}px`,
                    }}
                  >
                    {isFirstPara && dropCapChar && (
                      <span
                        contentEditable={false}
                        className="float-left font-serif text-5xl leading-none pr-3 pt-1 font-normal select-none"
                        style={{
                          color: palette.mode === 'night' ? '#A2B1C6' : '#996C42',
                        }}
                      >
                        {dropCapChar}
                      </span>
                    )}
                    {restPara}
                  </p>
                );
              })}
            </div>

            {/* Secondary Column (for 2-col or Golden Ratio 62/38) */}
            {columnMode !== '1-col' && (
              <div className="space-y-6 md:border-l md:pl-8 border-black/10 dark:border-white/10">
                {proseParagraphs.slice(Math.ceil(proseParagraphs.length / 2)).map((para, pIdx) => {
                  const actualIdx = Math.ceil(proseParagraphs.length / 2) + pIdx;
                  const estX = 650;
                  const estY = 200 + pIdx * 90;
                  const impact = calculateRippleImpact(estX, estY, ripples, performance.now(), isTyping);

                  return (
                    <p
                      key={actualIdx}
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onPointerDown={(e) => handleParagraphPointerDown(actualIdx, e)}
                      onPointerMove={handleParagraphPointerMove}
                      onPointerUp={handleParagraphPointerUp}
                      onPointerCancel={handleParagraphPointerUp}
                      onClick={(e) => handleParagraphClick(actualIdx, e)}
                      onInput={(e) => handleParagraphInput(actualIdx, e.currentTarget.innerText)}
                      onKeyDown={handleParagraphKeyDown}
                      className="transition-transform duration-100 ease-out text-justify outline-none focus:outline-none cursor-text select-text"
                      style={{
                        transform: `translate3d(${impact.dx}px, ${impact.dy}px, 0)`,
                        letterSpacing: `${typography.tracking + impact.trackingBoost}em`,
                        fontSize: `${typography.fontSize || 19}px`,
                      }}
                    >
                      {para}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          Z-AXIS PLANE +1: OVERLAY (Over)
          Stamps, seals, vector accents floating above prose
          ========================================================================= */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300"
        style={{
          zIndex: 30,
          opacity: activeZPlane === 1 ? 1 : 0.65,
        }}
      >
        <div className="absolute top-12 right-12 opacity-40 hover:opacity-90 transition-opacity">
          <div
            className="w-16 h-16 rounded-full border border-current flex items-center justify-center font-serif text-xs italic tracking-widest select-none rotate-12"
            style={{ color: palette.accentColor }}
          >
            MOTE · 1.0
          </div>
        </div>

        {parsedDoc.overlayAssets.map((asset) => (
          <div
            key={asset.id}
            className="absolute bottom-20 right-16 w-32 h-32 bg-contain bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url(${asset.url})`,
              opacity: (100 - asset.dim) / 100,
            }}
          />
        ))}
      </div>
    </div>
  );
};
