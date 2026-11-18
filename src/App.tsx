/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BootChoreography } from './components/BootChoreography';
import { TopBar } from './components/TopBar';
import { MoteBar, ColumnMode, BaselineGrid, TypographySettings } from './components/MoteBar';
import { SpatialCanvas } from './components/SpatialCanvas';
import { WaterRippleCanvas, FloatingBuoy, DissolvingThought } from './components/WaterRippleCanvas';
import { MeditationOverlay, MeditationMode } from './components/MeditationOverlay';
import { parseMoteMarkdown, ZPlane } from './utils/markdownParser';
import {
  AtmosphericMode,
  calculateSolarAngle,
  getAtmosphericPalette,
  getSolarPhase,
} from './utils/solarMath';
import { RippleSource, pruneExpiredRipples } from './utils/rippleMath';
import { SAMPLE_DOCUMENTS, DocumentData } from './data/sampleDocuments';
import { dsp } from './audio/dspEngine';

export default function App() {
  // Query param check for ?autostart=1 or #autostart
  const isAutostart = typeof window !== 'undefined' && (window.location.search.includes('autostart') || window.location.hash.includes('autostart'));
  const [bootCompleted, setBootCompleted] = useState<boolean>(() => isAutostart);

  // 2. Solar Chronometry & Atmospheric Themes
  const [atmosphericMode, setAtmosphericMode] = useState<AtmosphericMode>('daylight');
  const [solarAngle, setSolarAngle] = useState<number>(() => calculateSolarAngle(new Date()));

  // Auto-track solar angle
  useEffect(() => {
    const updateAngle = () => {
      setSolarAngle(calculateSolarAngle(new Date()));
    };
    const timer = setInterval(updateAngle, 60000);
    return () => clearInterval(timer);
  }, []);

  const palette = useMemo(() => {
    return getAtmosphericPalette(atmosphericMode, solarAngle);
  }, [atmosphericMode, solarAngle]);

  // Sync DSP solar scale
  useEffect(() => {
    dsp.setSolarPhase(getSolarPhase(solarAngle));
  }, [solarAngle]);

  // 3. Local-First Document Storage
  const [documents, setDocuments] = useState<DocumentData[]>(() => {
    try {
      const saved = localStorage.getItem('mote_documents');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return SAMPLE_DOCUMENTS;
  });

  const [currentDocId, setCurrentDocId] = useState<string>('doc-1');

  const currentDoc = useMemo(() => {
    return documents.find((d) => d.id === currentDocId) || documents[0];
  }, [documents, currentDocId]);

  const [rawText, setRawText] = useState<string>(currentDoc.content);

  // Sync rawText when current document changes
  useEffect(() => {
    setRawText(currentDoc.content);
  }, [currentDoc.id]);

  // Autosave to localStorage
  useEffect(() => {
    try {
      const updatedDocs = documents.map((doc) =>
        doc.id === currentDoc.id ? { ...doc, content: rawText, updatedAt: Date.now() } : doc
      );
      setDocuments(updatedDocs);
      localStorage.setItem('mote_documents', JSON.stringify(updatedDocs));
    } catch {
      // Fallback
    }
  }, [rawText, currentDoc.id]);

  // Parsed markdown representation
  const parsedDoc = useMemo(() => {
    return parseMoteMarkdown(rawText);
  }, [rawText]);

  // 4. Mote Bar & Layout States
  const [activeZPlane, setActiveZPlane] = useState<ZPlane>(0);
  const [columnMode, setColumnMode] = useState<ColumnMode>('1-col');
  const [baselineGrid, setBaselineGrid] = useState<BaselineGrid>('off');
  const [typography, setTypography] = useState<TypographySettings>({
    tracking: 0.02,
    leading: 1.65,
    weight: 400,
    fontSize: 19,
    dropCap: true,
  });

  // Mobile frame simulator toggle
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // 5. Water Ripple Physics & Surface Tension
  const [ripples, setRipples] = useState<RippleSource[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<number | null>(null);

  const handleAddRipple = useCallback((ripple: RippleSource) => {
    dsp.playWaterDrop(0.7);
    setRipples((prev) => [...prev, ripple]);
  }, []);

  // Keystroke handler for physical modeling sound
  const handleKeystroke = useCallback((char: string) => {
    dsp.playKeystroke(char);
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 450);
  }, []);

  // Prune expired ripples periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRipples((prev) => pruneExpiredRipples(prev, performance.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 6. Procedural Meditation Architecture
  const [meditationMode, setMeditationMode] = useState<MeditationMode>('off');
  const [isMuted, setIsMuted] = useState(false);
  const [floatingBuoys, setFloatingBuoys] = useState<FloatingBuoy[]>([
    { id: 'b1', text: 'resonance', x: 280, y: 320, vx: 0.15, vy: 0.08, opacity: 0.9 },
    { id: 'b2', text: 'open horizon', x: 580, y: 440, vx: -0.12, vy: 0.1, opacity: 0.85 },
  ]);
  const [dissolvingThoughts, setDissolvingThoughts] = useState<DissolvingThought[]>([]);

  const handleToggleMute = useCallback(() => {
    const muted = dsp.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleAddDissolvingThought = useCallback((thought: DissolvingThought) => {
    setDissolvingThoughts((prev) => [...prev, thought]);
    // Also emit a gentle water ripple at the center
    handleAddRipple({
      id: `rip-release-${Date.now()}`,
      x: thought.x,
      y: thought.y,
      startTime: performance.now(),
      amplitude: 1.2,
    });
  }, [handleAddRipple]);

  const handleAddFloatingBuoy = useCallback((text: string) => {
    const newBuoy: FloatingBuoy = {
      id: `buoy-${Date.now()}`,
      text,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 150,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: 1,
    };
    setFloatingBuoys((prev) => [...prev, newBuoy]);
  }, []);

  // 7. Document Actions
  const handleSelectDoc = (id: string) => {
    setCurrentDocId(id);
  };

  const handleNewDoc = () => {
    const newDoc: DocumentData = {
      id: `doc-${Date.now()}`,
      title: 'Untilted Solitude',
      content: `# Untitled Solitude\n/scrim radial\n/clip HORIZON\n\nBegin your thought here...`,
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);
    setRawText(newDoc.content);
  };

  const handleExport = (format: 'markdown' | 'txt' | 'print') => {
    if (format === 'print') {
      window.print();
      return;
    }

    const mime = format === 'markdown' ? 'text/markdown' : 'text/plain';
    const ext = format === 'markdown' ? 'md' : 'txt';
    const blob = new Blob([rawText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parsedDoc.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'mote'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Slash mask insert shortcuts
  const handleInsertMask = (type: 'clip' | 'punch') => {
    const directive = type === 'clip' ? '\n/clip NEW PERSPECTIVE\n' : '\n/punch SILENT MONOLITH\n';
    setRawText((prev) => prev + directive);
  };

  // 8. Idle Lifecycle (PRD Section 3)
  // 0:00 - 2:00: completely still canvas
  // 2:00 - 3:00: breathing ellipsis returns for 1-minute visual anchor
  // 3:00+: fades out entirely until touched
  const [idleTimeSec, setIdleTimeSec] = useState(0);
  const lastActiveTimeRef = useRef<number>(performance.now());

  const resetIdleTimer = useCallback(() => {
    lastActiveTimeRef.current = performance.now();
    setIdleTimeSec(0);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('pointermove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });

    const idleInterval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - lastActiveTimeRef.current) / 1000);
      setIdleTimeSec(elapsed);
    }, 2000);

    return () => {
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      clearInterval(idleInterval);
    };
  }, [resetIdleTimer]);

  const showIdleBreathingEllipsis = idleTimeSec >= 120 && idleTimeSec < 180;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-between font-sans antialiased"
      style={{
        background: palette.canvasBgGradient,
        color: palette.inkColor,
      }}
    >
      {/* Cinematic Boot Choreography */}
      {!bootCompleted && (
        <BootChoreography
          palette={palette}
          onComplete={() => setBootCompleted(true)}
          autostart={isAutostart}
        />
      )}

      {/* Unified Responsive Top Bar */}
      <TopBar
        palette={palette}
        atmosphericMode={atmosphericMode}
        onChangeAtmosphericMode={setAtmosphericMode}
        solarAngle={solarAngle}
        onChangeSolarAngle={setSolarAngle}
        meditationMode={meditationMode}
        onChangeMeditationMode={setMeditationMode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        documents={documents}
        currentDocId={currentDocId}
        onSelectDoc={handleSelectDoc}
        onNewDoc={handleNewDoc}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        onExport={handleExport}
        onReplayBoot={() => setBootCompleted(false)}
      />

      {/* Procedural Meditation Switcher & Overlays */}
      <MeditationOverlay
        palette={palette}
        mode={meditationMode}
        onChangeMode={setMeditationMode}
        onAddDissolvingThought={handleAddDissolvingThought}
        onAddFloatingBuoy={handleAddFloatingBuoy}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Container: Either Fullscreen Canvas or Mobile Android Frame */}
      <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        <div
          className={`relative transition-all duration-500 overflow-hidden ${
            isMobileFrame
              ? 'w-[390px] h-[812px] max-h-[92vh] rounded-[44px] border-[8px] border-black/80 dark:border-white/20 shadow-2xl flex flex-col'
              : 'w-full h-full flex flex-col'
          }`}
          style={{
            background: palette.canvasBgGradient,
          }}
        >
          {/* Mobile Bezel speaker / camera notch simulation in phone mode */}
          {isMobileFrame && (
            <div className="w-full h-6 flex items-center justify-center pointer-events-none z-50">
              <div className="w-24 h-4 bg-black/60 rounded-full mt-1.5" />
            </div>
          )}

          {/* Interactive Water Ripple & Hydrodynamic Canvas */}
          <WaterRippleCanvas
            palette={palette}
            ripples={ripples}
            onAddRipple={handleAddRipple}
            floatingBuoys={meditationMode === 'drift' ? floatingBuoys : []}
            dissolvingThoughts={dissolvingThoughts}
          />

          {/* Z-Axis Spatial Canvas (4 Depth Planes, Threaded Columns, Surface Tension) */}
          <SpatialCanvas
            parsedDoc={parsedDoc}
            rawText={rawText}
            onChangeRawText={setRawText}
            palette={palette}
            activeZPlane={activeZPlane}
            columnMode={columnMode}
            baselineGrid={baselineGrid}
            typography={typography}
            ripples={ripples}
            isTyping={isTyping}
            onKeystroke={handleKeystroke}
            foggedInkMode={meditationMode === 'drift'}
            isMeditationActive={meditationMode !== 'off'}
            onAddRipple={handleAddRipple}
          />

          {/* Idle 2:00 - 3:00 Breathing Ellipsis Anchor */}
          {showIdleBreathingEllipsis && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex space-x-1.5 text-xl font-mono opacity-60">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse delay-150">.</span>
              <span className="animate-pulse delay-300">.</span>
            </div>
          )}

          {/* Mobile-First Ergonomic Mote Bar docked above bottom */}
          <MoteBar
            palette={palette}
            activeZPlane={activeZPlane}
            onChangeZPlane={setActiveZPlane}
            columnMode={columnMode}
            onChangeColumnMode={setColumnMode}
            baselineGrid={baselineGrid}
            onChangeBaselineGrid={setBaselineGrid}
            typography={typography}
            onChangeTypography={setTypography}
            onInsertMask={handleInsertMask}
          />
        </div>
      </div>
    </div>
  );
}
