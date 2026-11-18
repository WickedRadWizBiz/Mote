/**
 * Unified Top Bar for Mote
 * Gracefully responsive across desktop (1440px) and mobile (390px).
 * Eliminates header overlapping and organizes meditation modes, solar chronometry,
 * document management, and publishing export into a clean editorial bar.
 */

import React, { useState } from 'react';
import { AtmosphericMode, SolarPalette, getSolarPhase } from '../utils/solarMath';
import { DocumentData } from '../data/sampleDocuments';
import { MeditationMode } from './MeditationOverlay';

interface TopBarProps {
  palette: SolarPalette;
  // Atmospheric & Solar
  atmosphericMode: AtmosphericMode;
  onChangeAtmosphericMode: (mode: AtmosphericMode) => void;
  solarAngle: number;
  onChangeSolarAngle: (angle: number) => void;
  // Meditation & Audio
  meditationMode: MeditationMode;
  onChangeMeditationMode: (mode: MeditationMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  // Documents & Views
  documents: DocumentData[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onExport: (format: 'markdown' | 'txt' | 'print') => void;
  onReplayBoot: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  palette,
  atmosphericMode,
  onChangeAtmosphericMode,
  solarAngle,
  onChangeSolarAngle,
  meditationMode,
  onChangeMeditationMode,
  isMuted,
  onToggleMute,
  documents,
  currentDocId,
  onSelectDoc,
  onNewDoc,
  isMobileFrame,
  onToggleMobileFrame,
  onExport,
  onReplayBoot,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSolarSlider, setShowSolarSlider] = useState(false);

  const solarPhase = getSolarPhase(solarAngle);

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 h-11 px-3 sm:px-6 flex items-center justify-between border-b backdrop-blur-md select-none text-xs font-mono transition-colors duration-500"
      style={{
        background: palette.mode === 'night' ? 'rgba(12, 15, 20, 0.85)' : 'rgba(250, 243, 235, 0.88)',
        borderColor: palette.mode === 'night' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 27, 24, 0.08)',
        color: palette.inkColor,
      }}
    >
      {/* LEFT: Meditation Modes & Procedural DSP Audio */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        <button
          type="button"
          onClick={() => onChangeMeditationMode(meditationMode === 'stillness' ? 'off' : 'stillness')}
          aria-label={meditationMode === 'stillness' ? 'Exit Stillness Mode' : 'Enter Stillness Mode (Stress Relief & Somatic Scan)'}
          className={`px-2 py-1 rounded transition-colors uppercase cursor-pointer text-[10px] sm:text-[11px] ${
            meditationMode === 'stillness'
              ? 'bg-amber-600/30 text-amber-800 dark:text-amber-200 font-semibold'
              : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
          }`}
        >
          {meditationMode === 'stillness' ? '● Stillness' : 'Stillness'}
        </button>

        <button
          type="button"
          onClick={() => onChangeMeditationMode(meditationMode === 'drift' ? 'off' : 'drift')}
          aria-label={meditationMode === 'drift' ? 'Exit Drift Mode' : 'Enter Drift Mode (Brainstorming & Floating Buoys)'}
          className={`px-2 py-1 rounded transition-colors uppercase cursor-pointer text-[10px] sm:text-[11px] ${
            meditationMode === 'drift'
              ? 'bg-sky-600/30 text-sky-800 dark:text-sky-200 font-semibold'
              : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
          }`}
        >
          {meditationMode === 'drift' ? '● Drift' : 'Drift'}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute procedural audio' : 'Mute procedural audio'}
          className="hidden sm:inline-flex px-1.5 py-1 rounded bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100 uppercase cursor-pointer text-[10px]"
        >
          {isMuted ? 'Muted' : 'DSP On'}
        </button>
      </div>

      {/* RIGHT: Atmospheric Themes, Solar Chronometry & Menu */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Solar Chronometry Pill */}
        <button
          type="button"
          onClick={() => setShowSolarSlider(!showSolarSlider)}
          aria-label={`Current solar elevation: ${Math.round(solarAngle)} degrees. Phase: ${solarPhase}.`}
          className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center space-x-1 cursor-pointer text-[10px] sm:text-[11px]"
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              background:
                palette.phase === 'daylight'
                  ? '#E2B887'
                  : palette.phase === 'goldenHour'
                  ? '#F59E0B'
                  : palette.phase === 'dusk' || palette.phase === 'sunrise'
                  ? '#EF4444'
                  : '#60A5FA',
            }}
          />
          <span className="capitalize">{palette.phase}</span>
          <span className="opacity-50 text-[9px]">{Math.round(solarAngle)}°</span>
        </button>

        {/* Theme mode: Day | Night | Solar */}
        <div className="flex rounded bg-black/5 dark:bg-white/5 p-0.5 border border-black/5 dark:border-white/5 text-[10px]">
          <button
            type="button"
            onClick={() => onChangeAtmosphericMode('daylight')}
            aria-label="Set Daylight theme"
            className={`px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer ${
              atmosphericMode === 'daylight' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-semibold' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onChangeAtmosphericMode('night')}
            aria-label="Set Night theme"
            className={`px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer ${
              atmosphericMode === 'night' ? 'bg-slate-800 text-slate-100 font-semibold' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Night
          </button>
          <button
            type="button"
            onClick={() => onChangeAtmosphericMode('dynamic')}
            aria-label="Set Dynamic Solar theme"
            className={`px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer ${
              atmosphericMode === 'dynamic' ? 'bg-amber-500/30 font-semibold' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Solar
          </button>
        </div>

        {/* Phone Frame Toggle (Hidden on actual phone screen size) */}
        <button
          type="button"
          onClick={onToggleMobileFrame}
          aria-label={isMobileFrame ? 'Switch to Fullscreen Canvas' : 'Preview Android Mobile Frame'}
          className={`hidden md:inline-flex px-2 py-1 rounded text-[10px] uppercase transition-colors cursor-pointer ${
            isMobileFrame ? 'bg-amber-600/20 text-amber-800 dark:text-amber-200 font-medium' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
          }`}
        >
          {isMobileFrame ? 'Phone' : 'Full'}
        </button>

        {/* Document / Publishing Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open document manager and export menu"
            aria-expanded={isMenuOpen}
            className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 uppercase cursor-pointer text-[10px] sm:text-[11px]"
          >
            Menu
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
              style={{
                background: palette.mode === 'night' ? 'rgba(17, 21, 28, 0.96)' : 'rgba(250, 243, 235, 0.97)',
                borderColor: palette.mode === 'night' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(30, 27, 24, 0.1)',
                color: palette.inkColor,
              }}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-50 px-2 py-1 font-semibold">
                Documents
              </div>
              <div className="space-y-1 mb-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDoc(doc.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs truncate transition-colors cursor-pointer ${
                      doc.id === currentDocId
                        ? 'bg-amber-500/20 font-semibold text-amber-800 dark:text-amber-200'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {doc.title || 'Untitled'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onNewDoc();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 uppercase tracking-wide cursor-pointer mb-2"
              >
                + New Document
              </button>

              <div className="border-t my-1 border-black/10 dark:border-white/10" />

              <div className="text-[10px] uppercase tracking-wider opacity-50 px-2 py-1 font-semibold">
                Export & Publishing
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onExport('markdown');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Export Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExport('txt');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Export Plain Text (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExport('print');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Print / PDF Layout
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReplayBoot();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Replay ". mote" Boot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Solar Elevation Angle Slider */}
      {showSolarSlider && (
        <div
          className="fixed top-12 right-4 z-50 p-3 rounded-xl shadow-xl border w-60 backdrop-blur-xl animate-fade-in"
          style={{
            background: palette.mode === 'night' ? 'rgba(17, 21, 28, 0.95)' : 'rgba(250, 243, 235, 0.96)',
            borderColor: palette.mode === 'night' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(30, 27, 24, 0.1)',
            color: palette.inkColor,
          }}
        >
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider mb-2 opacity-60">
            <span>Solar Chronometry</span>
            <span>{Math.round(solarAngle)}° ({solarPhase})</span>
          </div>
          <input
            type="range"
            min="-60"
            max="80"
            value={solarAngle}
            onChange={(e) => onChangeSolarAngle(parseFloat(e.target.value))}
            aria-label="Solar elevation angle slider"
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] opacity-40 mt-1">
            <span>Midnight (-60°)</span>
            <span>Dusk (0°)</span>
            <span>Noon (+80°)</span>
          </div>
        </div>
      )}
    </header>
  );
};
