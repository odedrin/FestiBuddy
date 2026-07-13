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
  'substance-ghb+substance-mda': {
    status: 'Dangerous',
    note: 'GHB combined with serotonergic stimulants raises risk of serotonin syndrome and unpredictable CNS depression.',
  },
  'substance-ghb+substance-mdma': {
    status: 'Dangerous',
    note: 'MDMA raises heart rate and temperature while GHB causes CNS depression. The opposing effects are unpredictable and can be fatal.',
  },
  'substance-amphetamine+substance-cocaine': {
    status: 'Dangerous',
    note: 'Combining two strong stimulants greatly strains the cardiovascular system and increases risk of cardiac arrest.',
  },

  // ─── Unsafe (high risk of serious harm) ─────────────────────────────────────

  'substance-cocaine+substance-mdma': {
    status: 'Unsafe',
    note: 'Both are cardiotoxic stimulants. Combined they dramatically increase heart rate and blood pressure, risking cardiac arrest.',
  },
  'substance-amphetamine+substance-mdma': {
    status: 'Unsafe',
    note: 'Excessive stimulation and serotonin release. Increases neurotoxicity risk, hyperthermia, and cardiovascular stress.',
  },
  'substance-cocaine+substance-mda': {
    status: 'Unsafe',
    note: 'Similar to cocaine + MDMA — severe cardiovascular strain and elevated neurotoxicity risk.',
  },
  'substance-amphetamine+substance-mda': {
    status: 'Unsafe',
    note: 'Combined stimulant and serotonergic load increases neurotoxicity, hyperthermia, and cardiovascular risk.',
  },
  'substance-cocaine+substance-ghb': {
    status: 'Unsafe',
    note: 'Stimulant crash may leave CNS depression dominant as cocaine clears; risk of sudden unconsciousness.',
  },
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
    note: 'Similar to alcohol + MDMA — dehydration and liver stress.',
  },
  'substance-alcohol+substance-amphetamine': {
    status: 'Caution',
    note: 'Amphetamine can mask the sedative effects of alcohol, leading to alcohol poisoning from underestimating intoxication.',
  },
  'substance-caffeine+substance-cocaine': {
    status: 'Caution',
    note: 'Additional cardiovascular stimulation. Increased risk of anxiety, elevated heart rate, and hypertension.',
  },
  'substance-caffeine+substance-amphetamine': {
    status: 'Caution',
    note: 'May cause excessive stimulation, anxiety, elevated heart rate, and sleep disruption.',
  },
  'substance-caffeine+substance-mdma': {
    status: 'Caution',
    note: 'Compounds cardiovascular load and dehydration. Can worsen MDMA comedown.',
  },
  'substance-cannabis-smoked+substance-mdma': {
    status: 'Caution',
    note: 'Cannabis can increase anxiety and paranoia on MDMA. Some find it pleasant; others experience a difficult mental state.',
  },
  'substance-cannabis-edible+substance-mdma': {
    status: 'Caution',
    note: 'Same as smoked cannabis + MDMA but with delayed onset making dose management harder.',
  },
  'substance-2cb+substance-lsd': {
    status: 'Caution',
    note: 'Extremely intense psychedelic experience. LSD significantly potentiates 2C-B, risk of overwhelming effects.',
  },
  'substance-2cb+substance-mescaline': {
    status: 'Caution',
    note: 'Unpredictable potentiation. Very long combined duration with risk of overwhelming effects.',
  },
  'substance-ketamine+substance-mdma': {
    status: 'Caution',
    note: 'Dissociation combined with empathogen effects. Some experience positive "candy k-flip"; high doses risk serious disorientation.',
  },
  'substance-alcohol+substance-cannabis-smoked': {
    status: 'Caution',
    note: 'Alcohol may intensify cannabis effects. Concurrent use can cause nausea and vomiting ("greening out").',
  },
  'substance-alcohol+substance-cannabis-edible': {
    status: 'Caution',
    note: 'Edibles have delayed onset; alcohol may cause profound over-intoxication if dose is misjudged.',
  },
  'substance-alcohol+substance-psilocybin': {
    status: 'Caution',
    note: 'Alcohol may blunt or unpredictably alter the psychedelic experience and increase nausea.',
  },
  'substance-alcohol+substance-lsd': {
    status: 'Caution',
    note: 'Alcohol may interfere with the experience; dehydration compounds. Some find it dampens effects, others find it destabilising.',
  },
  'substance-alcohol+substance-2cb': {
    status: 'Caution',
    note: 'Nausea risk and unpredictable alteration of psychedelic effects.',
  },

  // ─── Low Risk & Synergy ──────────────────────────────────────────────────────

  'substance-lsd+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'The "candy flip." Generally well-tolerated. MDMA is usually taken after LSD peak to extend the experience. Cardiovascular load is elevated.',
  },
  'substance-mdma+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'The "hippy flip." Reported as deeply positive. Psilocybin is often taken 1–2 hours after MDMA.',
  },
  'substance-2cb+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'The "nexus flip." 2C-B adds visual component to MDMA\'s empathogenic effects. Generally well-tolerated at moderate doses.',
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
  'substance-lsd+substance-2cb': {
    status: 'Low Risk & Synergy',
    note: 'If staggered (2C-B taken near LSD peak), generally positive with enhanced visuals. Concurrent dosing risks being overwhelming.',
  },
  'substance-dmt+substance-mdma': {
    status: 'Low Risk & Synergy',
    note: 'Brief psychedelic breakthrough within MDMA empathogenic state. Generally reported as safe and positive.',
  },
  'substance-cannabis-smoked+substance-lsd': {
    status: 'Low Risk & Synergy',
    note: 'Cannabis can intensify and expand LSD effects. Some enjoy the combination; others find it increases anxiety.',
  },
  'substance-cannabis-smoked+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'Cannabis can deepen and extend psilocybin effects, especially during comeup and offset.',
  },
  'substance-cannabis-edible+substance-lsd': {
    status: 'Low Risk & Synergy',
    note: 'Delayed edible onset means effects peak unpredictably during the LSD experience. Use with caution re: timing.',
  },
  'substance-mda+substance-psilocybin': {
    status: 'Low Risk & Synergy',
    note: 'Similar to hippy flip. MDA\'s longer duration pairs naturally with psilocybin.',
  },
  'substance-mda+substance-lsd': {
    status: 'Low Risk & Synergy',
    note: 'Very long, intense experience. Both have extended peak durations; plan for 10+ hours.',
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
  'substance-nicotine+substance-mdma': {
    status: 'Low Risk & No Synergy',
    note: 'Nicotine adds modest cardiovascular load on top of MDMA. Very common in practice; risk is minimal at normal doses.',
  },
  'substance-nicotine+substance-lsd': {
    status: 'Low Risk & No Synergy',
    note: 'Tobacco is commonly smoked during psychedelic experiences. Minimal pharmacological interaction.',
  },
  'substance-caffeine+substance-nicotine': {
    status: 'Low Risk & No Synergy',
    note: 'Additive stimulation. Very common everyday combination with low additional risk.',
  },
  'substance-nicotine+substance-psilocybin': {
    status: 'Low Risk & No Synergy',
    note: 'Common in practice. Minimal pharmacological interaction.',
  },
  'substance-nicotine+substance-cocaine': {
    status: 'Low Risk & No Synergy',
    note: 'Both are stimulants with some additive cardiovascular effect, but no significant synergy.',
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
