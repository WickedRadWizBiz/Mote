/**
 * Preloaded editorial sample documents for Mote.
 */

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export const SAMPLE_DOCUMENTS: DocumentData[] = [
  {
    id: 'doc-1',
    title: 'The Architecture of Silence',
    content: `# The Architecture of Silence
/scrim radial
/blend diff
![Alabaster Quarry :: under, bleed, dim:35, blur:4, blend:mult](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80)

/clip SILENCE

The morning sun creeps over the basalt ledge without sound. Space in classical typography was never empty; it was the breath between stone monoliths, the pauses between spoken syllables that permitted understanding to settle into memory.

When we remove the unnecessary chrome—the persistent notifications, toolbars, sidebars, and blinking cursors—the mind ceases its defensive scanning and yields to pure composition. Here on the page, letters exist not merely as data markers, but as physical weights anchored to a continuous baseline grid.

To write with surface tension is to understand that words possess inertia. A ripple cast upon the surface gently displaces each sentence like floating cedar shavings on still mountain water, returning each glyph precisely to rest.`,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'doc-2',
    title: 'Solar Chronometry & Spatial Depth',
    content: `# Solar Chronometry & Spatial Depth
/scrim bottom
/blend screen
![Obsidian Monolith :: depth, dim:25](https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80)

/punch LIGHT & SHADOW

Light does not merely illuminate; it defines hierarchy. As the sun traverses the meridian from morning peach into the deep slate of solar midnight, the contrast weight of typography shifts in organic cadence.

In professional multi-page publishing, layers are not abstract stack orders. The backdrop cradles texture; the prose layer threads across golden-ratio columns; the depth plane weaves title forms behind architectural subjects; and the overlay floats transparent stamps and marginalia.

By locking text to an 8pt baseline grid and calibrating optical line-height through thumb gestures, desktop publishing becomes as fluid as drawing with ink on vellum.`,
    updatedAt: Date.now() - 7200000,
  },
  {
    id: 'doc-3',
    title: 'Procedural Solitude',
    content: `# Procedural Solitude
/scrim top
/blend mult

/clip DRIFT

Enter into the stillness of procedural sound. The solar drone resonates with the natural frequency of the earth, aligning breath to harmonic intervals.

Observe your thoughts without urgency. When a sentence carries weight or unease, surrender it to the water release: watch the letters loosen from the baseline, float outward as ripples, and dissolve into granular chimes.

The page is infinite, timeless, and obedient only to your cadence. Breathe in as the central mote expands; exhale as it returns to its solitary origin.`,
    updatedAt: Date.now() - 86400000,
  },
];
