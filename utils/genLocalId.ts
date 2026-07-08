/**
 * Generates a locally-unique id for entries staged client-side (e.g. in
 * CreatePlanModal / EditPlanModal) before they're committed to an actual
 * plan. These ids are only ever used as React keys and as lookup keys
 * within the staging session itself — they don't need to match any
 * particular format, just be unique for the lifetime of the component.
 */
let _counter = 0;
export function genLocalId(prefix: string = 'local'): string {
  return `${prefix}-${Date.now()}-${(++_counter).toString(36)}`;
}
