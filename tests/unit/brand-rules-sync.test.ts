import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The marketing brief (marketing/BRIEF.md, section 6 "Never say") and the agent's brand rules
// (marketing-agent/brand-rules.md, section 3 "Banned claims") are edited by hand. This test
// fails when a banned claim is added to, or dropped from, one file but not the other.

const BRIEF = readFileSync('marketing/BRIEF.md', 'utf8');
const AGENT_RULES = readFileSync('marketing-agent/brand-rules.md', 'utf8');

/** Lines of one "## N. Title" section, up to the next "## " heading. */
function section(markdown: string, heading: RegExp): string[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^## /.test(l) && heading.test(l));
  if (start < 0) throw new Error(`Section ${heading} not found`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return end < 0 ? rest : rest.slice(0, end);
}

/** Bold markers are dropped so "**real shop**" matches /real shop/. */
const plain = (line: string) => line.replace(/\*\*/g, '');

const briefItems = section(BRIEF, /Never say/)
  .filter((l) => l.startsWith('- '))
  .map((l) => plain(l.slice(2)));

const agentLines = section(AGENT_RULES, /Banned claims/);
const agentItems = [
  // Table rows "| **B1 [auto]** ... |", skipping the header and separator rows.
  ...agentLines.filter((l) => /^\| \*\*B\d+/.test(l)).map(plain),
  // The "Also never (checked by you, the reviewer)" bullets.
  ...agentLines.filter((l) => l.startsWith('- ')).map((l) => plain(l.slice(2))),
];

/** Each banned claim, and how it is worded in each file. */
const TOPICS: { id: string; brief: RegExp; agent: RegExp }[] = [
  { id: 'AI as the selling point', brief: /\bAI\b/, agent: /AI-powered|人工智能/ },
  { id: 'fraud and accusations', brief: /fraud|scam|cheat/i, agent: /fraud|scam|cheat|dishonest/i },
  { id: 'replaces an accountant', brief: /replaces an accountant/i, agent: /replaces your accountant/i },
  { id: 'audited accounts', brief: /audited accounts/i, agent: /audited accounts/i },
  { id: 'tax advice', brief: /tax advice/i, agent: /tax advice/i },
  { id: 'savings promises and guarantees', brief: /guarantee/i, agent: /guarantee/i },
  { id: 'absolutes', brief: /100% accurate/i, agent: /100% accurate/i },
  { id: 'testimonials', brief: /testimonial/i, agent: /testimonial/i },
  { id: 'real shops or people', brief: /real shop/i, agent: /real shop/i },
  { id: 'fake urgency or pressure', brief: /urgency/i, agent: /pressure/i },
];

/**
 * Rules only the agent needs, because they are about what an automated writer may put in a
 * post body (the brief is for people writing copy by hand). Each one says why.
 */
const AGENT_ONLY: { rule: RegExp; reason: string }[] = [
  { rule: /^\| B7 /, reason: 'email addresses: the system adds the WhatsApp call to action' },
  { rule: /^\| B8 /, reason: 'unfilled placeholders: values come from the config tab' },
  { rule: /^\| B9 /, reason: 'phone numbers: only the configured WhatsApp number' },
  { rule: /monthly prices/i, reason: 'the brief covers this in section 4 ("Never quote it as a fixed price")' },
];

describe('banned-claim lists in marketing/BRIEF.md and marketing-agent/brand-rules.md', () => {
  it('finds both lists', () => {
    expect(briefItems.length).toBeGreaterThanOrEqual(5);
    expect(agentItems.length).toBeGreaterThanOrEqual(9);
  });

  it.each(TOPICS)('both files ban "$id"', ({ brief, agent }) => {
    expect(briefItems.some((item) => brief.test(item))).toBe(true);
    expect(agentItems.some((item) => agent.test(item))).toBe(true);
  });

  it('every claim the brief bans is a topic the agent rules also ban', () => {
    const unmatched = briefItems.filter((item) => !TOPICS.some((t) => t.brief.test(item)));
    expect(unmatched).toEqual([]);
  });

  it('every claim the agent rules ban is in the brief too, or is listed as agent-only', () => {
    const unmatched = agentItems.filter(
      (item) => !TOPICS.some((t) => t.agent.test(item)) && !AGENT_ONLY.some((a) => a.rule.test(item)),
    );
    expect(unmatched).toEqual([]);
  });

  it('section() throws a clear error when a heading is renamed', () => {
    expect(() => section('# Title\n## 1. Other\n- x', /Never say/)).toThrow(/Never say/);
  });
});
