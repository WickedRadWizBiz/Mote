/**
 * Atmospheric Themes & Solar Chronometry HUD for Mote
 * Coordinates Daylight / Night / Dynamic Solar modes, Solar elevation tracker,
 * Mobile Android Bezel simulation, Document switcher, and Exporting.
 */

import React, { useState } from 'react';
import { AtmosphericMode, SolarPalette, getSolarPhase } from '../utils/solarMath';
import { DocumentData } from '../data/sampleDocuments';

interface AtmosphericHUDProps {
  palette: SolarPalette;
  mode: AtmosphericMode;
  onChangeMode: (mode: AtmosphericMode) => void;
  solarAngle: number;
  onChangeSolarAngle: (angle: number) => void;
  documents: DocumentData[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onExport: (format: 'markdown' | 'txt' | 'print') => void;
  onReplayBoot: () => void;
}

export const AtmosphericHUD: React.FC<AtmosphericHUDProps> = ({
  palette,
  mode,
  onChangeMode,
  solarAngle,
  onChangeSolarAngle,
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
    <header className="fixed top-3 right-4 z-40 flex items-center space-x-2 text-xs font-mono select-none">
      {/* Solar Phase & Chronometry Pill */}
      <button
        type="button"
        onClick={() => setShowSolarSlider(!showSolarSlider)}
        aria-label={`Current solar elevation: ${Math.round(solarAngle)} degrees, phase: ${solarPhase}. Click to tune solar coordinates.`}
        className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center space-x-1.5 cursor-pointer"
        style={{ color: palette.inkColor }}
      >
        <span
          className="w-2 h-2 rounded-full transition-colors"
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
        <span className="opacity-50 text-[10px]">{Math.round(solarAngle)}°</span>
      </button>

      {/* Atmospheric Theme Switcher: Daylight | Night | Solar */}
      <div className="flex rounded bg-black/5 dark:bg-white/5 p-0.5 border border-black/5 dark:border-white/5">
        <button
          type="button"
          onClick={() => onChangeMode('daylight')}
          aria-label="Set Daylight theme"
          className={`px-2 py-0.5 rounded text-[10px] uppercase transition-colors cursor-pointer ${
            mode === 'daylight' ? 'bg-amber-100 text-amber-900 font-semibold shadow-xs' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: mode === 'daylight' ? '#1E1B18' : palette.inkColor }}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('night')}
          aria-label="Set Night theme"
          className={`px-2 py-0.5 rounded text-[10px] uppercase transition-colors cursor-pointer ${
            mode === 'night' ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: mode === 'night' ? '#D8DCE3' : palette.inkColor }}
        >
          Night
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('dynamic')}
          aria-label="Set Dynamic Solar theme"
          className={`px-2 py-0.5 rounded text-[10px] uppercase transition-colors cursor-pointer ${
            mode === 'dynamic' ? 'bg-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold shadow-xs' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: palette.inkColor }}
        >
          Solar
        </button>
      </div>

      {/* Android Mobile Frame toggle */}
      <button
        type="button"
        onClick={onToggleMobileFrame}
        aria-label={isMobileFrame ? 'Switch to Fullscreen Canvas' : 'Preview Android Mobile Frame'}
        className={`px-2 py-1 rounded text-[10px] uppercase transition-colors cursor-pointer ${
          isMobileFrame
            ? 'bg-amber-600/20 text-amber-800 dark:text-amber-200 font-medium'
            : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
        }`}
        style={{ color: palette.inkColor }}
      >
        {isMobileFrame ? 'Phone Frame' : 'Full Canvas'}
      </button>

      {/* Documents & Export Menu Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Open document manager and export menu"
          aria-expanded={isMenuOpen}
          className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors uppercase cursor-pointer"
          style={{ color: palette.inkColor }}
        >
          Menu
        </button>

        {isMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
            style={{
              background: palette.mode === 'night' ? 'rgba(17, 21, 28, 0.95)' : 'rgba(250, 243, 235, 0.96)',
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

      {/* Expandable Solar Elevation Angle Slider */}
      {showSolarSlider && (
        <div
          className="fixed top-12 right-4 z-40 p-3 rounded-xl shadow-xl border w-64 backdrop-blur-xl animate-fade-in"
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
