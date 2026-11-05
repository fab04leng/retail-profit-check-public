// Guardrail check for marketing copy. Run: npm run marketing:check
// Fails on claims we must never make, and on demo figures shown without a "demo data" label.
// It is a safety net, not a substitute for reading the copy.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.env.MARKETING_ROOT ?? 'marketing';
const EXTS = new Set(['.md', '.csv', '.html', '.srt', '.txt']);

// Always wrong, wherever they appear.
const BANNED = [
  [/\bfraud|\bscam|\bcheat\w*|embezzl/i, 'no fraud claims'],
  [/欺诈|诈骗|舞弊|作弊|做假账/, 'no fraud claims (ZH)'],
  [/AI[- ]powered|powered by AI|\bAI (finds|found|catches|caught|detects|spots|checks)\b|our AI\b/i, 'never present the product as AI'],
  [/AI\s*(帮你|找出|抓|检测|发现|分析你)/, 'never present the product as AI (ZH)'],
  [/(?<!(can't|cannot|can not|not|no|never|don't|won't) )\bguarantee/i, 'no guarantees'],
  [/(?<![不没无]|不能|无法|不会|不是)保证/, 'no guarantees (ZH)'],
  [/\b(you('ll| will)|we('ll| will)) save you\b|\bsave you RM|\bsaves? you RM|\brecover RM|\bget back RM|\bpays? for itself/i, 'never promise savings'],
  [/帮你省\s*RM|(?<![不没无]|不能|无法|不会)保证省|(?<!不)一定省|稳赚|回本/, 'never promise savings (ZH)'],
  [/\b100% accurate|never miss|catches every|finds every|all your (losses|leaks)/i, 'no accuracy absolutes'],
  [/(百分百|100%)准确|一个都不漏|全部找出/, 'no accuracy absolutes (ZH)'],
];

// Allowed only when the same line says NOT.
const NEEDS_NEGATION = [
  [/replace(s|d)?( your| an)? accountant|replacement for (your|an) accountant/i, /\bnot\b|n't\b|\bnever\b|\bno\b/i, 'only say it does NOT replace an accountant'],
  [/tax advice/i, /\bnot\b|n't\b|\bnever\b|\bno\b/i, 'only say it is NOT tax advice'],
  [/取代.{0,4}会计师|代替.{0,4}会计师/, /不|没/, 'only say it does NOT replace an accountant (ZH)'],
  [/税务意见|报税建议/, /不|没|找你的税务/, 'only say it is NOT tax advice (ZH)'],
];

// Figures from the fictional demo shop. Any paragraph/row that shows one must say it is demo data.
const DEMO_FIGURES = ['9,392.62', '3,130.27', '4,783.20', '8,410.86', '4,148.77', '2,922.75', '812.28', '5,400', '8,872.66', '759.78', '3,010.86', '392,140.69', '1,277,874.65'];
const DEMO_LABEL = /demo|fictional|made[- ]up|invented|示范|虚构|样本店|演示资料/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

/** Splits CSV text into records (quoted cells may contain newlines). */
function csvRecords(text) {
  const records = [];
  let current = '';
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if ((ch === '\n') && !quoted) {
      records.push(current);
      current = '';
    } else current += ch;
  }
  if (current) records.push(current);
  return records;
}

function chunks(file, text) {
  const ext = extname(file);
  if (ext === '.html') return [text]; // whole page must carry the label
  if (ext === '.csv') return csvRecords(text); // each row (post, ad, lead) must carry its own label
  if (ext === '.srt') return [text]; // a caption file is one video
  return text.split(/\n\s*\n/); // markdown paragraphs
}

const problems = [];
for (const file of walk(ROOT)) {
  if (file.includes('/scripts/')) continue;
  const text = readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, i) => {
    if (/copy-check:\s*ignore/.test(line)) return;
    for (const [re, why] of BANNED) if (re.test(line)) problems.push(`${file}:${i + 1}  ${why}\n    ${line.trim().slice(0, 160)}`);
    const isQuestion = /[?？]/.test(line); // FAQ questions such as "Do you give tax advice?" are fine
    for (const [re, neg, why] of NEEDS_NEGATION) if (re.test(line) && !neg.test(line) && !isQuestion) problems.push(`${file}:${i + 1}  ${why}\n    ${line.trim().slice(0, 160)}`);
  });
  for (const chunk of chunks(file, text)) {
    const fig = DEMO_FIGURES.find((f) => chunk.includes(f));
    if (fig && !DEMO_LABEL.test(chunk)) problems.push(`${file}  demo figure RM ${fig} without a "demo data" label\n    ${chunk.trim().slice(0, 160)}`);
  }
}

if (problems.length) {
  console.error(`Copy check: ${problems.length} problem(s)\n\n${problems.join('\n\n')}`);
  process.exit(1);
}
console.log('Copy check passed.');
