/**
 * Mobile-First Ergonomics: The "Mote Bar"
 * 36px/40px translucent strip docked above keyboard / bottom bezel.
 * Zone 1 (Left - Structure): Column splits (1-col, 2-col, 62/38), Frame threading, Baseline Grid.
 * Zone 2 (Center - Typography): 2D scrubber (X: Tracking, Y: Leading & Weight), Double-tap: Drop Cap.
 * Zone 3 (Right - Layers & Masks): Z-axis depth plane scrubber (Z -1, 0, +0.5, +1), /clip & /punch.
 * Haptic Language: Tactile ticks (8ms), Baseline grid clicks (25ms), Double-pulse membrane ([12, 40, 12]ms).
 */

import React, { useState, useRef } from 'react';
import { ZPlane } from '../utils/markdownParser';
import { SolarPalette } from '../utils/solarMath';

export type ColumnMode = '1-col' | '2-col' | 'golden-62-38';
export type BaselineGrid = 'off' | '8pt' | '12pt' | '16pt';

export interface TypographySettings {
  tracking: number; // in em (-0.05 to +0.25)
  leading: number; // line-height multiplier (1.2 to 2.2)
  weight: number; // 200 to 800
  fontSize: number; // in px (15 to 26)
  dropCap: boolean; // initial drop cap enabled
}

interface MoteBarProps {
  palette: SolarPalette;
  activeZPlane: ZPlane;
  onChangeZPlane: (plane: ZPlane) => void;
  columnMode: ColumnMode;
  onChangeColumnMode: (mode: ColumnMode) => void;
  baselineGrid: BaselineGrid;
  onChangeBaselineGrid: (grid: BaselineGrid) => void;
  typography: TypographySettings;
  onChangeTypography: (updater: (prev: TypographySettings) => TypographySettings) => void;
  onInsertMask: (type: 'clip' | 'punch') => void;
}

export const MoteBar: React.FC<MoteBarProps> = ({
  palette,
  activeZPlane,
  onChangeZPlane,
  columnMode,
  onChangeColumnMode,
  baselineGrid,
  onChangeBaselineGrid,
  typography,
  onChangeTypography,
  onInsertMask,
}) => {
  // Scrubber state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubberFeedback, setScrubberFeedback] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialTracking: number; initialLeading: number; initialWeight: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Haptic feedback trigger
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Fallback
      }
    }
  };

  // Zone 1: Cycle Column Layout
  const cycleColumns = () => {
    triggerHaptic(8); // Tactile tick
    const nextMode: ColumnMode =
      columnMode === '1-col' ? '2-col' : columnMode === '2-col' ? 'golden-62-38' : '1-col';
    onChangeColumnMode(nextMode);
  };

  // Zone 1: Cycle Baseline Grid
  const cycleBaseline = () => {
    triggerHaptic(25); // Heavy baseline grid click
    const nextGrid: BaselineGrid =
      baselineGrid === 'off' ? '8pt' : baselineGrid === '8pt' ? '12pt' : baselineGrid === '12pt' ? '16pt' : 'off';
    onChangeBaselineGrid(nextGrid);
  };

  // Zone 2: 2D Typography Scrubber Touch/Pointer Handlers
  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double-tap detected: toggle drop cap
    if (timeSinceLastTap < 300) {
      triggerHaptic([12, 40, 12]); // Double pulse membrane resistance
      onChangeTypography((prev) => ({ ...prev, dropCap: !prev.dropCap }));
      setScrubberFeedback(typography.dropCap ? 'Drop Cap: Off' : 'Drop Cap: 3-Line InDesign');
      setTimeout(() => setScrubberFeedback(null), 1200);
      return;
    }

    setIsScrubbing(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialTracking: typography.tracking,
      initialLeading: typography.leading,
      initialWeight: typography.weight,
    };
    triggerHaptic(8);
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = dragStartRef.current.y - e.clientY; // upward is positive

    // Horizontal drag -> Tracking (-0.05em to +0.25em)
    const newTracking = Math.max(-0.05, Math.min(0.25, dragStartRef.current.initialTracking + deltaX * 0.0015));

    // Vertical drag -> Leading (1.2 to 2.2) and Weight (200 to 800)
    const newLeading = Math.max(1.2, Math.min(2.2, dragStartRef.current.initialLeading + deltaY * 0.006));
    const newWeight = Math.max(200, Math.min(800, Math.round(dragStartRef.current.initialWeight + deltaY * 2.5)));

    onChangeTypography((prev) => ({
      ...prev,
      tracking: Number(newTracking.toFixed(3)),
      leading: Number(newLeading.toFixed(2)),
      weight: newWeight,
    }));

    setScrubberFeedback(
      `Trk ${newTracking >= 0 ? '+' : ''}${newTracking.toFixed(2)}em · Ld ${newLeading.toFixed(2)} · Wt ${newWeight}`
    );
  };

  const handleScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      triggerHaptic(8);
      setIsScrubbing(false);
      dragStartRef.current = null;
      setTimeout(() => setScrubberFeedback(null), 1000);
    }
  };

  // Zone 3: Cycle Z-Plane
  const cycleZPlane = () => {
    triggerHaptic(8);
    const planes: ZPlane[] = [-1, 0, 0.5, 1];
    const currentIndex = planes.indexOf(activeZPlane);
    const nextIndex = (currentIndex + 1) % planes.length;
    onChangeZPlane(planes[nextIndex]);
  };

  return (
    <div
      role="toolbar"
      aria-label="Mote Bar publishing controls"
      className="fixed bottom-0 inset-x-0 z-40 h-10 px-3 flex items-center justify-between border-t select-none transition-colors duration-500"
      style={{
        background: palette.mode === 'night' ? 'rgba(12, 15, 20, 0.88)' : 'rgba(250, 243, 235, 0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: palette.mode === 'night' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 27, 24, 0.08)',
        color: palette.inkColor,
      }}
    >
      {/* ZONE 1 (Left - Structure): Columns & Baseline Grid */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-[11px] font-mono tracking-tight shrink-0">
        <button
          type="button"
          onClick={cycleColumns}
          aria-label={`Column split mode: ${columnMode}`}
          className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors uppercase cursor-pointer"
        >
          {columnMode === '1-col' ? '1 Col' : columnMode === '2-col' ? '2 Col' : '62/38'}
        </button>

        <button
          type="button"
          onClick={cycleBaseline}
          aria-label={`Baseline grid snap: ${baselineGrid}`}
          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition-colors uppercase cursor-pointer ${
            baselineGrid !== 'off'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
              : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
          }`}
        >
          {baselineGrid === 'off' ? 'Grid Off' : baselineGrid}
        </button>
      </div>

      {/* ZONE 2 (Center - Typography 2D Scrubber): Zero-icon touch pad */}
      <div
        onPointerDown={handleScrubberPointerDown}
        onPointerMove={handleScrubberPointerMove}
        onPointerUp={handleScrubberPointerUp}
        onPointerCancel={handleScrubberPointerUp}
        role="slider"
        aria-label="2D Typography Scrubber (Drag horizontal for Tracking, vertical for Leading and Weight. Double tap for Drop Cap)"
        aria-valuenow={Math.round(typography.tracking * 100)}
        className="flex-1 min-w-[90px] mx-1.5 sm:mx-3 h-7 flex items-center justify-center rounded cursor-ew-resize relative px-1 sm:px-2 overflow-hidden touch-none bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
      >
        {scrubberFeedback ? (
          <span className="text-[10px] sm:text-[11px] font-mono font-medium tracking-tight animate-fade-in text-amber-700 dark:text-amber-300 truncate">
            {scrubberFeedback}
          </span>
        ) : (
          <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] font-sans opacity-75">
            <span className="font-serif italic font-medium hidden xs:inline">Newsreader</span>
            <span className="text-[9px] sm:text-[10px] font-mono opacity-60">
              Trk {typography.tracking >= 0 ? '+' : ''}{typography.tracking} · Ld {typography.leading}
            </span>
            {typography.dropCap && (
              <span className="text-[8px] sm:text-[9px] font-mono uppercase bg-amber-500/25 px-1 rounded font-bold">
                Cap
              </span>
            )}
          </div>
        )}

        {/* Subtle scrubber guideline pip */}
        <div
          className="absolute bottom-0 h-0.5 bg-amber-600/40 dark:bg-amber-400/50 transition-all pointer-events-none"
          style={{
            left: `${((typography.tracking + 0.05) / 0.3) * 100}%`,
            width: '12px',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* ZONE 3 (Right - Layers & Masks): Z-Axis & /clip, /punch */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-[11px] font-mono shrink-0">
        <button
          type="button"
          onClick={cycleZPlane}
          aria-label={`Active Z-plane: ${activeZPlane}`}
          className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
        >
          {activeZPlane === -1
            ? 'Z -1'
            : activeZPlane === 0
            ? 'Z 0'
            : activeZPlane === 0.5
            ? 'Z +½'
            : 'Z +1'}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onInsertMask('clip');
          }}
          aria-label="Insert live /clip text fill"
          className="px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 uppercase cursor-pointer"
        >
          /clip
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onInsertMask('punch');
          }}
          aria-label="Insert live /punch stencil knockout"
          className="px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 uppercase cursor-pointer"
        >
          /punch
        </button>
      </div>
    </div>
  );
};
