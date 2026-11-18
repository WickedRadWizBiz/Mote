/**
 * Solar chronometry and atmospheric color interpolation for Mote.
 * Computes solar coordinates, atmospheric phase, and OKLab-approximated pigment palettes.
 */

export type AtmosphericMode = 'daylight' | 'night' | 'dynamic';

export type SolarPhase = 'sunrise' | 'daylight' | 'goldenHour' | 'dusk' | 'night';

export interface SolarPalette {
  mode: AtmosphericMode;
  phase: SolarPhase;
  canvasBg: string; // Background color
  canvasBgGradient: string; // Rich gradient
  inkColor: string; // Primary text color
  inkMuted: string; // Secondary / muted text
  accentColor: string; // Accent color
  sunbeamOpacity: number;
  lightAngleDeg: number;
  contrastWeight: number; // 100 - 900
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates solar elevation angle (-90 to +90 degrees)
 * based on date and approximate coordinates.
 */
export function calculateSolarAngle(date: Date, coords: Coordinates = { latitude: 37.77, longitude: -122.41 }): number {
  const dayOfYear = getDayOfYear(date);
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  // Solar declination approx in radians
  const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180) * (Math.PI / 180);

  // Solar time approximation
  const timeOffset = (coords.longitude * 4) / 60; // hours
  const solarTime = (hour + timeOffset + 24) % 24;
  const hourAngle = (solarTime - 12) * 15 * (Math.PI / 180);

  const latRad = coords.latitude * (Math.PI / 180);

  const sinElevation = Math.sin(latRad) * Math.sin(declination) + Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
  const elevationDeg = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * (180 / Math.PI);

  return elevationDeg;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determines solar phase from solar angle.
 */
export function getSolarPhase(solarAngle: number): SolarPhase {
  if (solarAngle > 25) return 'daylight';
  if (solarAngle > 8) return 'goldenHour';
  if (solarAngle > -4) return 'dusk';
  if (solarAngle > -12) return 'sunrise';
  return 'night';
}

/**
 * Returns static or interpolated palette based on mode and solar angle.
 */
export function getAtmosphericPalette(mode: AtmosphericMode, solarAngle: number = 45): SolarPalette {
  if (mode === 'daylight') {
    return {
      mode: 'daylight',
      phase: 'daylight',
      canvasBg: '#FAF3EB',
      canvasBgGradient: 'linear-gradient(175deg, #FAF3EB 0%, #F5E6D8 100%)',
      inkColor: '#1E1B18',
      inkMuted: '#685F56',
      accentColor: 'rgba(226, 184, 135, 0.45)',
      sunbeamOpacity: 0.18,
      lightAngleDeg: 135,
      contrastWeight: 400,
    };
  }

  if (mode === 'night') {
    return {
      mode: 'night',
      phase: 'night',
      canvasBg: '#0C0F14',
      canvasBgGradient: 'linear-gradient(180deg, #11151C 0%, #0C0F14 100%)',
      inkColor: '#D8DCE3',
      inkMuted: '#7A8494',
      accentColor: 'rgba(42, 52, 70, 0.65)',
      sunbeamOpacity: 0.08,
      lightAngleDeg: 215,
      contrastWeight: 350,
    };
  }

  // Dynamic Solar Mode interpolation
  const phase = getSolarPhase(solarAngle);
  // Normalized sun position 0 (midnight) to 1 (noon)
  const normSun = Math.max(0, Math.min(1, (solarAngle + 30) / 90));

  if (phase === 'daylight') {
    return {
      mode: 'dynamic',
      phase: 'daylight',
      canvasBg: '#FAF3EB',
      canvasBgGradient: 'linear-gradient(160deg, #FAF3EB 0%, #F4E5D4 100%)',
      inkColor: '#1E1B18',
      inkMuted: '#685F56',
      accentColor: 'rgba(226, 184, 135, 0.35)',
      sunbeamOpacity: 0.18 * normSun,
      lightAngleDeg: 120 + normSun * 30,
      contrastWeight: 420,
    };
  }

  if (phase === 'goldenHour') {
    return {
      mode: 'dynamic',
      phase: 'goldenHour',
      canvasBg: '#F7EDE2',
      canvasBgGradient: 'linear-gradient(145deg, #F9EFE4 0%, #EED5BA 100%)',
      inkColor: '#221915',
      inkMuted: '#785E4F',
      accentColor: 'rgba(235, 168, 92, 0.5)',
      sunbeamOpacity: 0.28,
      lightAngleDeg: 105,
      contrastWeight: 450,
    };
  }

  if (phase === 'dusk' || phase === 'sunrise') {
    return {
      mode: 'dynamic',
      phase,
      canvasBg: '#1B1A24',
      canvasBgGradient: 'linear-gradient(170deg, #261F2C 0%, #161722 100%)',
      inkColor: '#E8E2D8',
      inkMuted: '#968E9C',
      accentColor: 'rgba(196, 130, 110, 0.45)',
      sunbeamOpacity: 0.15,
      lightAngleDeg: 90,
      contrastWeight: 380,
    };
  }

  // Night
  return {
    mode: 'dynamic',
    phase: 'night',
    canvasBg: '#0C0F14',
    canvasBgGradient: 'linear-gradient(180deg, #11151C 0%, #0C0F14 100%)',
    inkColor: '#D8DCE3',
    inkMuted: '#7A8494',
    accentColor: 'rgba(42, 52, 70, 0.55)',
    sunbeamOpacity: 0.06,
    lightAngleDeg: 220,
    contrastWeight: 340,
  };
}
