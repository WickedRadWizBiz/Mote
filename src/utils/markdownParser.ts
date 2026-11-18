/**
 * Markdown & Z-Axis Spatial Layout Parser for Mote
 * Handles 4-plane Z-axis parsing, inline media attributes, slash commands (/clip, /punch, /scrim, /blend),
 * and InDesign column layout threading.
 */

export type ZPlane = -1 | 0 | 0.5 | 1;

export interface LayerAsset {
  id: string;
  url: string;
  alt: string;
  plane: ZPlane;
  bleed: boolean;
  dim: number; // 0 - 100 opacity reduction
  blur: number; // blur px
  blendMode: 'normal' | 'difference' | 'multiply' | 'screen' | 'overlay';
  scrim: 'none' | 'top' | 'bottom' | 'radial';
  depthSubjectCutout?: string; // For Z +0.5 depth split foreground subject
}

export interface ClippedTextDirective {
  text: string;
  mode: 'clip' | 'punch';
  sourceUrl?: string;
  sourceGradient?: string;
  panX: number; // percentage pan
  panY: number;
  scale: number;
}

export interface ParsedDocument {
  title: string;
  proseMarkdown: string;
  backdropAssets: LayerAsset[]; // Z -1
  depthSplitAssets: LayerAsset[]; // Z +0.5
  overlayAssets: LayerAsset[]; // Z +1
  clippedSections: ClippedTextDirective[];
  activeScrim: 'none' | 'top' | 'bottom' | 'radial';
  activeBlend: 'normal' | 'difference' | 'multiply' | 'screen' | 'overlay';
}

/**
 * Parses image tag shorthand:
 * ![alt text :: under, bleed, dim:40, blur:8, blend:mult](url)
 * or ![alt text :: depth, cutout:url](url)
 * or ![alt text :: over, dim:20](url)
 */
export function parseImageDirective(line: string): LayerAsset | null {
  const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
  if (!match) return null;

  const rawConfig = match[1];
  const url = match[2].trim();

  // Parse config parts separated by "::"
  const parts = rawConfig.split('::');
  const alt = parts[0].trim();
  const directives = parts[1] ? parts[1].split(',').map(s => s.trim().toLowerCase()) : [];

  let plane: ZPlane = 0;
  let bleed = false;
  let dim = 0;
  let blur = 0;
  let blendMode: LayerAsset['blendMode'] = 'normal';
  let scrim: LayerAsset['scrim'] = 'none';
  let depthSubjectCutout: string | undefined = undefined;

  for (const dir of directives) {
    if (dir === 'under' || dir === 'backdrop' || dir === 'z:-1') plane = -1;
    else if (dir === 'depth' || dir === 'split' || dir === 'z:0.5') plane = 0.5;
    else if (dir === 'over' || dir === 'overlay' || dir === 'z:1') plane = 1;
    else if (dir === 'bleed') bleed = true;
    else if (dir.startsWith('dim:')) {
      const val = parseInt(dir.replace('dim:', ''), 10);
      if (!isNaN(val)) dim = Math.min(100, Math.max(0, val));
    } else if (dir.startsWith('blur:')) {
      const val = parseInt(dir.replace('blur:', ''), 10);
      if (!isNaN(val)) blur = Math.max(0, val);
    } else if (dir.startsWith('blend:')) {
      const b = dir.replace('blend:', '');
      if (b === 'diff' || b === 'difference') blendMode = 'difference';
      else if (b === 'mult' || b === 'multiply') blendMode = 'multiply';
      else if (b === 'screen') blendMode = 'screen';
      else if (b === 'overlay') blendMode = 'overlay';
    } else if (dir.startsWith('cutout:')) {
      depthSubjectCutout = dir.replace('cutout:', '');
    }
  }

  return {
    id: `asset-${Math.random().toString(36).substring(2, 9)}`,
    url,
    alt,
    plane,
    bleed,
    dim,
    blur,
    blendMode,
    scrim,
    depthSubjectCutout,
  };
}

/**
 * Parses raw markdown document content and isolates Z-axis planes & directives.
 */
export function parseMoteMarkdown(rawText: string): ParsedDocument {
  const lines = rawText.split('\n');
  const backdropAssets: LayerAsset[] = [];
  const depthSplitAssets: LayerAsset[] = [];
  const overlayAssets: LayerAsset[] = [];
  const clippedSections: ClippedTextDirective[] = [];
  const cleanProseLines: string[] = [];

  let activeScrim: ParsedDocument['activeScrim'] = 'none';
  let activeBlend: ParsedDocument['activeBlend'] = 'normal';
  let title = 'Untitled Mote';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Title detection
    if (trimmed.startsWith('# ') && title === 'Untitled Mote') {
      title = trimmed.replace('# ', '').trim();
      continue;
    }

    // Slash command: /scrim [top | bottom | radial]
    if (trimmed.startsWith('/scrim')) {
      const scrimType = trimmed.replace('/scrim', '').trim().toLowerCase();
      if (scrimType === 'top' || scrimType === 'bottom' || scrimType === 'radial') {
        activeScrim = scrimType;
      } else if (scrimType === 'none' || scrimType === 'off') {
        activeScrim = 'none';
      }
      continue;
    }

    // Slash command: /blend [diff | mult | screen | normal]
    if (trimmed.startsWith('/blend')) {
      const blendType = trimmed.replace('/blend', '').trim().toLowerCase();
      if (blendType === 'diff' || blendType === 'difference') activeBlend = 'difference';
      else if (blendType === 'mult' || blendType === 'multiply') activeBlend = 'multiply';
      else if (blendType === 'screen') activeBlend = 'screen';
      else if (blendType === 'overlay') activeBlend = 'overlay';
      else activeBlend = 'normal';
      continue;
    }

    // Slash command: /clip {text} or /punch {text}
    if (trimmed.startsWith('/clip') || trimmed.startsWith('/punch')) {
      const isClip = trimmed.startsWith('/clip');
      const text = trimmed.replace(isClip ? '/clip' : '/punch', '').trim();
      clippedSections.push({
        text: text || 'SURFACE TENSION',
        mode: isClip ? 'clip' : 'punch',
        panX: 50,
        panY: 50,
        scale: 100,
      });
      continue;
    }

    // Image directive check
    const asset = parseImageDirective(trimmed);
    if (asset) {
      if (asset.plane === -1) {
        backdropAssets.push(asset);
        continue;
      } else if (asset.plane === 0.5) {
        depthSplitAssets.push(asset);
        continue;
      } else if (asset.plane === 1) {
        overlayAssets.push(asset);
        continue;
      }
    }

    cleanProseLines.push(line);
  }

  return {
    title,
    proseMarkdown: cleanProseLines.join('\n'),
    backdropAssets,
    depthSplitAssets,
    overlayAssets,
    clippedSections,
    activeScrim,
    activeBlend,
  };
}
