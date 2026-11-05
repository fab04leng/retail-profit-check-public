import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// FINAL_REVIEW item 13: prospects' WhatsApp and Messenger messages may be sent to an AI
// writing tool to draft a reply. The landing-page FAQ and the WhatsApp greeting must say so,
// in English and Chinese, and say that a person checks every reply before it is sent.

const LANDING = readFileSync('marketing/landing/index.html', 'utf8');
const ADS_README = readFileSync('marketing/ads/README.md', 'utf8');

/** The <details> block of the landing-page FAQ whose summary matches `question`. */
function faqEntry(question: RegExp): string {
  const entries = LANDING.match(/<details>[\s\S]*?<\/details>/g) ?? [];
  const entry = entries.find((e) => question.test(e.match(/<summary>[\s\S]*?<\/summary>/)?.[0] ?? ''));
  if (!entry) throw new Error(`No FAQ entry for ${question}`);
  return entry;
}

describe('AI-drafting notice', () => {
  it('the landing-page FAQ explains it in English', () => {
    const entry = faqEntry(/Who writes your WhatsApp replies\?/);
    expect(entry).toMatch(/AI writing tool/);
    expect(entry).toMatch(/person on our team checks every reply before it is sent/);
    expect(entry).toMatch(/text of your message is sent to that service/);
  });

  it('the landing-page FAQ explains it in Chinese', () => {
    const entry = faqEntry(/WhatsApp 回复是谁写的？/);
    expect(entry).toMatch(/AI 写作工具/);
    expect(entry).toMatch(/真人检查/);
  });

  it('sits in the FAQ section, next to "Is this AI?"', () => {
    const faq = LANDING.slice(LANDING.indexOf('id="faq"'), LANDING.indexOf('FINAL CTA'));
    expect(faq.indexOf('Is this AI?')).toBeGreaterThan(-1);
    expect(faq.indexOf('Who writes your WhatsApp replies?')).toBeGreaterThan(faq.indexOf('Is this AI?'));
  });

  it('the WhatsApp Business greeting message carries it in English and Chinese', () => {
    const greeting = ADS_README.slice(ADS_README.indexOf('**Greeting message'));
    expect(greeting).toMatch(/may be drafted with an AI writing tool and are checked by a person before they are sent/);
    expect(greeting).toMatch(/AI 写作工具起草.*真人检查/);
  });
});
