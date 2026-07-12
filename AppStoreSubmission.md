# DoseAngel — App Store Connect Copy (draft)

One finding before you use this: I checked precedent, and **TripSit's own app — the exact data source DoseAngel's interaction database is built on — is not on the iOS App Store**, specifically because Apple's guidelines (1.4.2/1.4.3) restrict apps that reference illegal drugs by name. TripSit ships Android-only for this reason. That doesn't mean DoseAngel can't get approved, but it means the copy below leans conservative on purpose — it avoids naming specific controlled substances in anything reviewers see before installing (description, keywords, screenshots). The in-app Combos/Substances screens still name MDMA, LSD, cocaine, etc., and reviewers do install and test the binary, so conservative metadata reduces risk but doesn't eliminate it. Two honest paths forward if it gets bounced: reframe the built-in substance list as generic/removable "types" with no bundled drug names (custom types only), or pursue Android first where this restriction doesn't exist.

---

## App Name
**DoseAngel**

## Subtitle (30 char max)
**Substance Timing & Safety** (25/30)

Alternates:
- "Know What's in Your System" (26/30)
- "Timing, Interactions, Safety" (28/30)

## Promotional Text (170 char max, editable without review)
> Track multiple substances as overlapping curves. See peak, comedown, and interaction risk in real time — fully offline. (119/170)

## Keywords (100 char max, comma-separated, no spaces)
```
harm reduction,interaction checker,trip planner,dose timer,pharmacokinetics,drug safety,party safety
```
(100/100 — deliberately omits specific substance names)

## Description (4000 char max)

```
DoseAngel helps you plan and track how substances affect you over time — so you can avoid dangerous combinations, prevent unintentional re-dosing, and know what to expect next.

HOW IT WORKS
Every substance is modeled as a curve: onset, comeup, peak, and offset. When you're tracking more than one at a time, DoseAngel sums the curves in real time and shows you the combined effect — not a guess, but a deterministic projection based on the timing you enter.

KEY FEATURES

Live tracking — Start a timer the moment you take something. Watch a live graph of your current and predicted effect level, with a clear "now" marker splitting what already happened from what's projected next.

Plan mode — Preview a whole evening before it starts. Stage multiple entries, adjust their timing, and see the combined curve without starting anything for real.

Interaction awareness — DoseAngel includes a curated interaction reference (sourced from TripSit combination data) covering commonly co-used substances. When you add something that has a known interaction with what's already active, you get a warning before you confirm — with a severity level and a plain-language explanation.

Fully customizable — Two built-in timing profiles cover common patterns, and a library of pharmacokinetic reference profiles (sourced from PsychonautWiki population data) covers many commonly discussed substances. Every profile can be duplicated and adjusted, or you can build your own from scratch or anything else with a known onset/peak/offset pattern.

Combination lookup — A dedicated screen lets you check any two substances against each other directly, without starting any timer, so you can look something up before you're already mid-plan.

PRIVACY
DoseAngel is 100% offline. Nothing you enter is transmitted anywhere or stored outside your device — no account, no analytics, no cloud sync. A built-in disclosure screen explains this in plain language on first launch.

IMPORTANT
DoseAngel is a personal planning and reference tool, not medical advice. Timing data reflects population averages; individual response varies with dose, body weight, tolerance, and metabolism. It does not calculate or recommend dosages. If you have questions about a specific substance or medical condition, consult a healthcare professional. In an emergency, contact your local emergency services immediately.
```

(~1,850 of 4000 chars — room to expand if you want more feature detail)

## What's New (v1.0)
```
First release of DoseAngel: live superposition tracking, Plan mode for previewing timing before you commit, a combination-interaction reference, and a fully offline, on-device design.
```

## Category
Primary: **Health & Fitness** (Medical is the other option, but Medical apps face additional Apple review requirements around clinical accuracy claims — Health & Fitness better matches a reference/planning tool with no diagnostic claims).

## Age Rating Questionnaire
The "Frequent/Intense References to Drugs, Alcohol, or Tobacco" question should be answered honestly (Frequent/Intense) — this pushes the rating to 17+. Trying to soften this answer to get a lower rating is more likely to trigger manual scrutiny than the honest 17+ answer.

## App Review Notes (private — reviewers only, not public)
```
DoseAngel is a personal harm-reduction planning tool, not a dosage calculator. It does not tell users how much of anything to take. Its only function is to let a user record when they took something and visualize the resulting timing curve (onset/peak/offset), including the combined effect when tracking more than one substance at once.

The bundled "Substances" library provides population-average timing data sourced from PsychonautWiki (a widely cited harm-reduction reference wiki) and an interaction-severity reference sourced from TripSit's combination data (also a widely used harm-reduction resource). This data is read-only reference material, analogous to a drug-interaction reference in a pharmacy app, not promotional or instructional content encouraging use.

The app does not facilitate the purchase, sale, or acquisition of any substance. It has no social features, no marketplace, no messaging. All data is stored locally on-device with no network calls — see Settings > Privacy & disclosure inside the app.

The interaction-warning feature is a safety feature: when a user is about to log a second substance that has a known dangerous or unsafe interaction with something already active, the app blocks the action with a warning modal until the user explicitly confirms. This is designed to reduce harm for people who are already making their own choices, not to encourage those choices.

Happy to answer any questions or walk through specific screens if useful for review.
```

---

## Still needed before submitting
- Public Privacy Policy URL (hosted — Settings > Privacy & disclosure content is a good source to adapt)
- Support URL
- 6.9" iPhone screenshots (1320×2868), 3–10 images — suggest Live graph, Plan mode, Combos screen, and the Disclosure screen
- Apple Developer account + bundle ID (`com.odedrin.DoseAngel`) registered before `eas submit`
