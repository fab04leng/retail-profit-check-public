/** Accountant rule-review pack: everything except file writing (see scripts/accountant-pack.ts). */
import { analyseDemo, demoSettings } from '../demo/accuracy';
import { generateDemo, type DemoData } from '../demo/generate';
import { buildExamples, type EvidenceFile } from './packExamples';
import { rulesVersion, type Pack } from './packRender';

export { renderHtml, renderMarkdown, pdfFooter, rulesVersion } from './packRender';
export type { Pack } from './packRender';
export type { EvidenceFile } from './packExamples';

export function buildPack(demo: DemoData = generateDemo()): { pack: Pack; evidence: EvidenceFile[] } {
  const settings = demoSettings(demo);
  const result = analyseDemo(demo, settings);
  const { examples, evidence } = buildExamples(demo, result, settings.thresholds);
  const period = result.period ?? { from: demo.start, to: demo.end };
  return { pack: { rulesVersion: rulesVersion(), shopName: demo.shopName, period, examples }, evidence };
}
