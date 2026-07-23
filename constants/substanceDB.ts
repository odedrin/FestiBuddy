/**
 * Bundled harm-reduction substance database.
 *
 * Pharmacokinetic data is sourced from PsychonautWiki (oral ROA midpoints
 * unless noted) and cross-referenced with TripSit. All durations are
 * mid-range estimates — individual responses vary significantly based on
 * dose, bodyweight, tolerance, and metabolism.
 *
 * These types are read-only (isBuiltIn + isSubstance = true).
 * They live here rather than in AsyncStorage so the data always reflects
 * the latest bundled version.
 */

import type { StopwatchType } from '@/types/models';

const MIN = 60_000; // 1 minute in ms

export const SUBSTANCE_TYPES: StopwatchType[] = [
  // ─── Empathogens ───────────────────────────────────────────────────────────

  {
    id: 'substance-mdma',
    name: 'MDMA',
    color: '#FF6B9D',
    // Oral (PsychonautWiki). Onset: 30–45 min | Comeup: 15–30 min | Peak: 1.5–2.5h | Offset: 1–1.5h
    onsetDuration: 37 * MIN,
    comeupDuration: 22 * MIN,
    peakDuration: 120 * MIN,
    offsetDuration: 75 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-mda',
    name: 'MDA',
    color: '#E74C3C',
    // Oral (PsychonautWiki). Onset: 30–90 min | Comeup: 15–45 min | Peak: 2.5–4h | Offset: 2–3h
    onsetDuration: 60 * MIN,
    comeupDuration: 30 * MIN,
    peakDuration: 195 * MIN,
    offsetDuration: 150 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },

  // ─── Psychedelics ──────────────────────────────────────────────────────────

  {
    id: 'substance-lsd',
    name: 'LSD',
    color: '#9B59B6',
    // Sublingual (PsychonautWiki lists LSD under sublingual, not oral). Onset: 15–30 min | Comeup: 45–90 min | Peak: 3–5h | Offset: 3–5h
    onsetDuration: 22 * MIN,
    comeupDuration: 67 * MIN,
    peakDuration: 240 * MIN,
    offsetDuration: 240 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.15,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-psilocybin',
    name: 'Psilocybin',
    color: '#27AE60',
    // Oral (PsychonautWiki). Onset: 20–45 min | Comeup: 1–1.5h | Peak: 2–2.5h | Offset: 2.5–3.5h
    onsetDuration: 32 * MIN,
    comeupDuration: 75 * MIN,
    peakDuration: 135 * MIN,
    offsetDuration: 180 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-2cb',
    name: '2C-B',
    color: '#E91E63',
    // Oral (PsychonautWiki). Onset: 20–40 min | Comeup: 1–1.5h | Peak: 1–1.5h | Offset: 2.5–3.5h
    onsetDuration: 30 * MIN,
    comeupDuration: 75 * MIN,
    peakDuration: 75 * MIN,
    offsetDuration: 180 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-mescaline',
    name: 'Mescaline',
    color: '#FF5722',
    // Oral (PsychonautWiki). Onset: 45–90 min | Comeup: 1–2h | Peak: 4–6h | Offset: 2–3h
    onsetDuration: 67 * MIN,
    comeupDuration: 90 * MIN,
    peakDuration: 300 * MIN,
    offsetDuration: 150 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.1,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-dmt',
    name: 'DMT (smoked)',
    color: '#9C27B0',
    // Smoked (PsychonautWiki). Onset: 20–40 sec | Comeup: 1–3 min | Peak: 2–8 min | Offset: 1–6 min
    onsetDuration: Math.round(0.5 * MIN),
    comeupDuration: 2 * MIN,
    peakDuration: 5 * MIN,
    offsetDuration: Math.round(3.5 * MIN),
    peakValue: 100,
    onsetEndFraction: 0.4,
    onsetShape: 'linear',
    comeupShape: 'easeOut',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },

  // ─── Dissociatives ─────────────────────────────────────────────────────────

  {
    id: 'substance-ketamine',
    name: 'Ketamine',
    color: '#00BCD4',
    // Insufflated (PsychonautWiki). Onset: 1–3 min | Comeup: 5–15 min | Peak: 15–45 min | Offset: 30–60 min
    onsetDuration: 2 * MIN,
    comeupDuration: 10 * MIN,
    peakDuration: 30 * MIN,
    offsetDuration: 45 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.35,
    onsetShape: 'linear',
    comeupShape: 'easeOut',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },

  // ─── Depressants ───────────────────────────────────────────────────────────

  {
    id: 'substance-alcohol',
    name: 'Alcohol (1 drink)',
    color: '#F39C12',
    // Oral (PsychonautWiki). Onset: 2–5 min | Comeup: 15–45 min | Peak: 30–90 min | Offset: 45–120 min
    onsetDuration: 3 * MIN,
    comeupDuration: 30 * MIN,
    peakDuration: 60 * MIN,
    offsetDuration: 82 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.25,
    onsetShape: 'easeOut',
    comeupShape: 'easeOut',
    offsetShape: 'linear',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-ghb',
    name: 'GHB',
    color: '#2980B9',
    // Oral (PsychonautWiki). Onset: 5–30 min | Comeup: 10–20 min | Peak: 45–90 min | Offset: 15–30 min
    onsetDuration: 17 * MIN,
    comeupDuration: 15 * MIN,
    peakDuration: 67 * MIN,
    offsetDuration: 22 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },

  // ─── Stimulants ────────────────────────────────────────────────────────────

  {
    id: 'substance-cocaine',
    name: 'Cocaine',
    color: '#85C1E9',
    // Insufflated (PsychonautWiki). Onset: 3–10 min | Comeup: 5–12 min | Peak: 7.5–16 min | Offset: 10–25 min
    onsetDuration: 6 * MIN,
    comeupDuration: 8 * MIN,
    peakDuration: 12 * MIN,
    offsetDuration: 17 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.3,
    onsetShape: 'linear',
    comeupShape: 'easeOut',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-amphetamine',
    name: 'Amphetamine',
    color: '#E67E22',
    // Oral (PsychonautWiki). Onset: 30–45 min | Comeup: 30–135 min | Peak: 2.5–4h | Offset: 2–3h
    onsetDuration: 37 * MIN,
    comeupDuration: 82 * MIN,
    peakDuration: 195 * MIN,
    offsetDuration: 150 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-caffeine',
    name: 'Caffeine',
    color: '#A04000',
    // Oral (PsychonautWiki). Onset: 5–10 min | Comeup: 10–60 min | Peak: 1–2h | Offset: 6–10h
    onsetDuration: 7 * MIN,
    comeupDuration: 35 * MIN,
    peakDuration: 90 * MIN,
    offsetDuration: 480 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.15,
    onsetShape: 'easeOut',
    comeupShape: 'easeOut',
    offsetShape: 'linear',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-nicotine',
    name: 'Nicotine (smoked)',
    color: '#95A5A6',
    // Smoked (PsychonautWiki). Onset: 5–20 sec | Comeup: 5–10 sec | Peak: 2–5 min | Offset: 1–2h
    onsetDuration: Math.round((12.5 / 60) * MIN),
    comeupDuration: Math.round((7.5 / 60) * MIN),
    peakDuration: Math.round(3.5 * MIN),
    offsetDuration: 90 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.3,
    onsetShape: 'linear',
    comeupShape: 'easeOut',
    offsetShape: 'linear',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-3mmc',
    name: '3-MMC',
    color: '#F1C40F',
    // Oral (PsychonautWiki, verified — matches midpoints exactly). Onset: 10–30 min | Comeup: 30–60 min | Peak: 2–3h | Offset: 1–1.5h
    onsetDuration: 20 * MIN,
    comeupDuration: 45 * MIN,
    peakDuration: 150 * MIN,
    offsetDuration: 75 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-4mmc',
    name: 'Mephedrone (4-MMC)',
    color: '#D4AC0D',
    // Oral (PsychonautWiki, verified — matches midpoints closely). Onset: 15–45 min | Comeup: 15–30 min | Peak: 2–4h | Offset: 45–90 min
    onsetDuration: 30 * MIN,
    comeupDuration: 22 * MIN,
    peakDuration: 180 * MIN,
    offsetDuration: 67 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.2,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },

  // ─── Cannabis ──────────────────────────────────────────────────────────────

  {
    id: 'substance-cannabis-smoked',
    name: 'Cannabis (smoked)',
    color: '#2ECC71',
    // Smoked (PsychonautWiki). Onset: 0.1–10 min | Comeup: 5–10 min | Peak: 15–45 min | Offset: 3–4h
    onsetDuration: 5 * MIN,
    comeupDuration: 7 * MIN,
    peakDuration: 30 * MIN,
    offsetDuration: 210 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.3,
    onsetShape: 'linear',
    comeupShape: 'easeOut',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
  {
    id: 'substance-cannabis-edible',
    name: 'Cannabis (edible)',
    color: '#1E8449',
    // Oral (PsychonautWiki). Onset: 20–60 min | Comeup: 30–60 min | Peak: 1–2h | Offset: 4–6h
    onsetDuration: 40 * MIN,
    comeupDuration: 45 * MIN,
    peakDuration: 90 * MIN,
    offsetDuration: 300 * MIN,
    peakValue: 100,
    onsetEndFraction: 0.15,
    onsetShape: 'easeOut',
    comeupShape: 'sigmoid',
    offsetShape: 'easeIn',
    isBuiltIn: true,
    isSubstance: true,
  },
];

/** Lookup a substance type by ID. */
export function getSubstanceById(id: string): StopwatchType | undefined {
  return SUBSTANCE_TYPES.find(s => s.id === id);
}
