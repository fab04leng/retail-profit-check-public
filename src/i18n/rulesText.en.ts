import { RULES } from '../rules/rules.config';

/** English rule text comes straight from the rules config, so it never drifts. */
export const ruleTextEn = Object.fromEntries(RULES.map((r) => [r.id, { title: r.title, description: r.description, why: r.why }]));
export const thresholdLabelsEn = Object.fromEntries(RULES.flatMap((r) => r.thresholds.map((t) => [t.key, t.label])));
