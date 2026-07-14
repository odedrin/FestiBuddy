/**
 * Drug interaction database.
 *
 * Data is sourced from TripSit's combos.json and cross-referenced with
 * published pharmacology literature. Interaction statuses follow TripSit's
 * classification system.
 *
 * Keys are the two substance IDs joined by '+', always in alphabetical order.
 * Use getInteraction() rather than indexing directly.
 */

export type InteractionStatus =
  | 'Dangerous'
  | 'Unsafe'
  | 'Caution'
  | 'Low Risk & Decrease'
  | 'Low Risk & No Synergy'
  | 'Low Risk & Synergy';

export interface Interaction {
  status: InteractionStatus;
  note: string;
}

// Internal map: key = sorted(idA, idB).join('+')
const INTERACTIONS: Record<string, Interaction> = {

  // ─── Dangerous (serious risk of death or severe harm) ───────────────────────

  'substance-alcohol+substance-ghb': {
    status: 'Dangerous',
    note: 'Both depress the CNS. The combination dramatically increases the risk of respiratory depression, loss of consciousness, and death.',
  },
  'substance-alcohol+substance-ketamine': {
    status: 'Dangerous',
    note: 'Both are CNS depressants. Combined they significantly increase the risk of respiratory depression and unconsciousness.',
  },
  'substance-ghb+substance-ketamine': {
    status: 'Dangerous',
    note: 'Two CNS depressants with unpredictable synergy. High risk of respiratory failure and loss of consciousness.',
  },
  // ─── Unsafe (high risk of serious harm) ─────────────────────────────────────

  'substance-alcohol+substance-cocaine': {
    status: 'Unsafe',
    note: 'The liver converts ethanol and cocaine into the cardiotoxic metabolite cocaethylene, which prolongs and increases cocaine\'s effects and cardiac strain.',
  },

  // ─── Caution (notable risk, use with care) ───────────────────────────────────

  'substance-alcohol+substance-mdma': {
    status: 'Caution',
    note: 'Alcohol worsens MDMA-induced dehydration and puts additional strain on the liver. May blunt desired effects.',
  },
  'substance-alcohol+substance-mda': {
    status: 'Caution',
    note: 'Similar to alcohol + MDMA: dehydration and liver stress. PsychonautWiki also warns that stimulants can mask alcohol\'s depressant effects, raising the risk of over-intoxication once the MDA wears off. Not in TripSit\'s dataset (MDA isn\'t tracked there); rated by analogy to alcohol + MDMA, corroborated by PsychonautWiki.',
  },
  'substance-ghb+substance-mda': {
    status: 'Caution',
    note: 'GHB\'s sedation can be masked by MDA\'s stimulant effects, then hit harder as the MDA wears off, the same risk PsychonautWiki documents for MDA + alcohol. Not in TripSit\'s or PsychonautWiki\'s dataset for this exact pair; rated by analogy to GHB + MDMA.',
  },
  'substance-cocaine+substance-mda': {
    status: 'Caution',
    note: 'Two stimulants add cardiovascular strain. PsychonautWiki notes this combination "may increase strain on the heart." Not in TripSit\'s dataset (MDA isn\'t tracked there); rated by analogy to cocaine + MDMA, corroborated by PsychonautWiki.',
  },
  'substance-amphetamine+substance-mda': {
    status: 'Caution',
    note: 'Two stimulants add cardiovascular strain, similar to amphetamine + MDMA. PsychonautWiki also flags a specific risk: combining with amphetamine has been linked to mania, paranoia, and hallucinations in people coming off long-term amphetamine use. Not in TripSit\'s dataset (MDA isn\'t tracked there); rated by analogy to amphetamine + MDMA, corroborated by PsychonautWiki.',
  },
  'substance-alcohol+substance-amphetamine': {
    status: 'Caution',
    note: 'Amphetamine can mask the sedative effects of alcohol, leading to alcohol poisoning from underestimating intoxication.',
  },
  'substance-caffeine+substance-cocaine': {
    status: 'Caution',
    note: 'Additional cardiovascular stimulation. Increased risk of anxiety, elevated heart rate, and hypertension.',
  },
  'substance-amphetamine+substance-caffeine': {
    status: 'Caution',
    note: 'May cause excessive stimulation, anxiety, elevated heart rate, and sleep disruption.',
  },
  'substance-caffeine+substance-mdma': {
    status: 'Caution',
    note: 'Compounds cardiovascular load and dehydration. Can worsen MDMA comedown.',
  },
  'substance-2cb+substance-mescaline': {
    status: 'Caution',
    note: 'Unpredictable potentiation. Very long combined duration with risk of overwhelming effects.',
  },
  'substance-ghb+substance-mdma': {
    status: 'Caution',
    note: 'Large amounts of GHB can overwhelm MDMA\'s effects as the comedown starts, adding unpredictable sedation on top of the crash.',
  },
  'substance-amphetamine+substance-cocaine': {
    status: 'Caution',
    note: 'Two stimulants increase cardiovascular strain, and cocaine mildly blocks some of amphetamine\'s effects, so the added heart strain often isn\'t worth it.',
  },
  'substance-cocaine+substance-mdma': {
    status: 'Caution',
    note: 'Cocaine blunts some of MDMA\'s desired effects while adding cardiovascular strain and heart attack risk.',
  },
  'substance-amphetamine+substance-mdma': {
    status: 'Caution',
    note: 'Two stimulants add cardiovascular strain and can increase anxiety and uncomfortable thought loops. Amphetamine may also raise MDMA\'s neurotoxicity and body temperature.',
  },
  'substance-cocaine+substance-ghb': {
    status: 'Caution',
    note: 'Stimulants can mask GHB\'s sedation, allowing a higher effective GHB dose than intended. If the cocaine wears off first, the GHB can hit harder than expected; if the GHB wears off first, a dangerous concentration of cocaine may remain.',
  },
  'substance-cannabis-smoked+substance-lsd': {
    status: 'Caution',
    note: 'Cannabis has an unexpectedly strong and somewhat unpredictable synergy with psychedelics. Start with less cannabis than usual.',
  },
  'substance-cannabis-edible+substance-lsd': {
    status: 'Caution',
    note: 'Same unpredictable synergy as smoked cannabis + LSD, plus the edible\'s delayed onset makes timing and dosing harder to judge.',
  },
  'substance-cannabis-smoked+substance-psilocybin': {
    status: 'Caution',
    note: 'Cannabis has an unexpectedly strong and somewhat unpredictable synergy with psychedelics. Start with less cannabis than usual.',
  },

  // ─── Low Risk & Synergy ──────────────────────────────────────────────────────

  'substance-lsd+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'The "candy flip." Generally well-tolerated. MDMA is usually taken after LSD peak to extend the experience. Cardiovascular load is elevated.',
  },
  'substance-mdma+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'The "hippy flip." Reported as deeply positive. Psilocybin is often taken 1-2 hours after MDMA.',
  },
  'substance-2cb+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'The "nexus flip." 2C-B adds a visual component to MDMA\'s empathogenic effects. Generally well-tolerated at moderate doses.',
  },
  'substance-lsd+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'Intense psychedelic combination. Synergistic at low doses; high doses can be overwhelming.',
  },
  'substance-lsd+substance-mescaline': {
    status: 'Low Risk & Synergy',
    note: 'Very long and intense psychedelic experience. The combination is generally predictable if both substances are used separately first.',
  },
  'substance-mescaline+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'Synergistic psychedelic experience. Long duration combined (10+ hours). Best for experienced users.',
  },
  'substance-dmt+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'Brief psychedelic breakthrough within MDMA\'s empathogenic state. Generally reported as safe and positive.',
  },
  'substance-mda+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'Similar to the hippy flip (MDMA + psilocybin). MDA\'s longer duration pairs naturally with psilocybin. Not in TripSit\'s or PsychonautWiki\'s combination data; rated by analogy to MDMA + psilocybin.',
  },
  'substance-lsd+substance-mda': {
    status: 'Low Risk & Synergy',
    note: 'Very long, intense experience. Both have extended peak durations; plan for 10+ hours. Not in TripSit\'s or PsychonautWiki\'s combination data; rated by analogy to MDMA + LSD.',
  },
  'substance-2cb+substance-lsd': {
    status: 'Low Risk & Synergy',
    note: 'If staggered (2C-B taken near LSD peak), generally positive with enhanced visuals. Concurrent dosing can be very intense, especially at high doses.',
  },
  'substance-cannabis-smoked+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'Large amounts of cannabis can make the MDMA experience stronger and less predictable. Best saved for later in the experience rather than combined from the start.',
  },
  'substance-cannabis-edible+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'Same as smoked cannabis + MDMA, with the edible\'s delayed onset adding some unpredictability to timing.',
  },
  'substance-ketamine+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'No unexpected interactions at sensible doses, though blood pressure may rise. Moving around at high combined doses raises injury risk due to ketamine\'s dissociation.',
  },
  'substance-alcohol+substance-cannabis-smoked': {
    status: 'Low Risk & Synergy',
    note: 'In excess this combination can cause nausea and vomiting ("greening out"), but at moderate doses it\'s low risk.',
  },
  'substance-alcohol+substance-cannabis-edible': {
    status: 'Low Risk & Synergy',
    note: 'Same as alcohol + smoked cannabis, though the edible\'s delayed onset makes it easier to misjudge how much alcohol you\'ve layered on top.',
  },

  // ─── Low Risk & Decrease ─────────────────────────────────────────────────────

  'substance-alcohol+substance-psilocybin': {
    status: 'Low Risk & Decrease',
    note: 'Alcohol tends to blunt and shorten the psilocybin experience rather than add risk. May still increase nausea.',
  },
  'substance-alcohol+substance-lsd': {
    status: 'Low Risk & Decrease',
    note: 'Alcohol tends to blunt and shorten the LSD experience rather than add risk.',
  },
  'substance-2cb+substance-alcohol': {
    status: 'Low Risk & Decrease',
    note: 'Alcohol tends to blunt and shorten the 2C-B experience rather than add risk.',
  },

  // ─── Low Risk & No Synergy ────────────────────────────────────────────────────

  'substance-caffeine+substance-lsd': {
    status: 'Low Risk & No Synergy',
    note: 'Caffeine adds little to the LSD experience. May increase anxiety. Generally unnecessary.',
  },
  'substance-caffeine+substance-psilocybin': {
    status: 'Low Risk & No Synergy',
    note: 'Low added risk but no real synergy. May add to anxiety.',
  },
  'substance-caffeine+substance-cannabis-smoked': {
    status: 'Low Risk & No Synergy',
    note: 'Common combination. May slightly increase anxiety and heart rate in some individuals.',
  },
};

/**
 * Look up the interaction between two substances.
 * Returns undefined if no interaction data exists for the pair.
 */
export function getInteraction(idA: string, idB: string): Interaction | undefined {
  const key = [idA, idB].sort().join('+');
  return INTERACTIONS[key];
}

/**
 * Get all known interactions for a given substance ID.
 * Returns an array of { otherId, interaction } objects.
 */
export function getInteractionsForSubstance(
  id: string,
): { otherId: string; interaction: Interaction }[] {
  const results: { otherId: string; interaction: Interaction }[] = [];
  for (const [key, interaction] of Object.entries(INTERACTIONS)) {
    const [a, b] = key.split('+');
    if (a === id) results.push({ otherId: b, interaction });
    else if (b === id) results.push({ otherId: a, interaction });
  }
  return results;
}

/**
 * Get all pairwise interactions between the given list of substance IDs.
 * Useful for checking a set of active/planned stopwatches.
 */
export function getActiveInteractions(
  ids: string[],
): { idA: string; idB: string; interaction: Interaction }[] {
  const results: { idA: string; idB: string; interaction: Interaction }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const interaction = getInteraction(ids[i], ids[j]);
      if (interaction) {
        results.push({ idA: ids[i], idB: ids[j], interaction });
      }
    }
  }
  return results;
}

/** Severity rank for sorting (lower = more severe). */
export const INTERACTION_SEVERITY: Record<InteractionStatus, number> = {
  Dangerous: 0,
  Unsafe: 1,
  Caution: 2,
  'Low Risk & Synergy': 3,
  'Low Risk & Decrease': 4,
  'Low Risk & No Synergy': 5,
};

/** Colour associated with each status (for UI badges). */
export const INTERACTION_COLOR: Record<InteractionStatus, string> = {
  Dangerous: '#FF3B30',
  Unsafe: '#FF9500',
  Caution: '#FFCC00',
  'Low Risk & No Synergy': '#34C759',
  'Low Risk & Decrease': '#30D158',
  'Low Risk & Synergy': '#30D158',
};
