import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Runs the marketing copy guardrail (marketing/scripts/check-copy.mjs) against throwaway files.
const dirs: string[] = [];

function check(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'copy-check-'));
  dirs.push(root);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  const run = spawnSync(process.execPath, ['marketing/scripts/check-copy.mjs'], {
    env: { ...process.env, MARKETING_ROOT: root },
    encoding: 'utf8',
  });
  return { ok: run.status === 0, output: `${run.stdout}${run.stderr}` };
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('marketing copy check', () => {
  it('passes honest copy with labelled demo figures', () => {
    const result = check({
      'post.md': [
        'In our demo shop (fictional data), the check flagged RM 4,783.20 in possible duplicate invoices.',
        '',
        "It's an analysis aid. It doesn't replace your accountant and isn't tax advice.",
        '',
        '我们不能保证省到钱。它不会取代你的会计师，也不是税务意见。',
        '',
        'Do you give tax advice?',
      ].join('\n'),
    });
    expect(result.output).toContain('Copy check passed');
    expect(result.ok).toBe(true);
  });

  it.each([
    ['Our AI finds the leaks in your shop.', 'never present the product as AI'],
    ['Catch supplier fraud before it happens.', 'no fraud claims'],
    ['Find out if staff cheated you.', 'no fraud claims'],
    ['揪出员工舞弊！', 'no fraud claims (ZH)'],
    ['Guaranteed results in 2 weeks.', 'no guarantees'],
    ['保证找到问题。', 'no guarantees (ZH)'],
    ["We'll save you RM 5,000 a year.", 'never promise savings'],
    ['It replaces your accountant.', 'only say it does NOT replace an accountant'],
    ['Includes tax advice for your shop.', 'only say it is NOT tax advice'],
    ['它可以取代你的会计师。', 'only say it does NOT replace an accountant (ZH)'],
    ['We catch every mistake, 100% accurate.', 'no accuracy absolutes'],
  ])('flags: %s', (line, reason) => {
    const result = check({ 'bad.md': line });
    expect(result.ok).toBe(false);
    expect(result.output).toContain(reason);
  });

  it('flags a demo figure without a demo-data label in the same paragraph', () => {
    const result = check({ 'post.md': 'A Penang shop found RM 9,392.62 in slow stock.\n\nDemo data is fictional.' });
    expect(result.ok).toBe(false);
    expect(result.output).toContain('without a "demo data" label');
  });

  it('checks each CSV row on its own, including multi-line cells', () => {
    const csv = 'day,body\n1,"Demo shop (fictional):\nRM 3,130.27 below cost"\n2,"Shops lose RM 3,130.27 below cost"\n';
    const result = check({ 'calendar.csv': csv });
    expect(result.ok).toBe(false);
    expect(result.output.match(/without a "demo data" label/g)).toHaveLength(1);
  });
});
