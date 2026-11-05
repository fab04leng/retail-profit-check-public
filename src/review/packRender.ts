/**
 * Renders the accountant rule-review pack as Markdown (for reading on GitHub)
 * and as printable HTML (A4, one rule per page; printed to PDF by
 * scripts/accountant-pack.ts). Pure string functions, no I/O.
 */
import zhDict from '../i18n/zh';
import { formatNum } from '../i18n/format';
import { RULES, type RuleDef, type ThresholdDef } from '../rules/rules.config';
import { compressRows, DEMO_FILE_NAMES, type ExampleTable, type WorkedExample } from './packExamples';
import { RULE_NOTES, type PackLang } from './packNotes';
import type { RuleId } from '../rules/rules.config';

export interface Pack {
  /** Short hash of rules.config.ts content, so a sign-off can be tied to one version of the rules. */
  rulesVersion: string;
  shopName: string;
  period: { from: string; to: string };
  examples: Record<RuleId, WorkedExample>;
}

/** FNV-1a over the rules' JSON. Changes whenever a rule, wording or threshold changes. */
export function rulesVersion(rules: readonly RuleDef[] = RULES): string {
  const text = JSON.stringify(rules);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const UNITS: Record<PackLang, Record<ThresholdDef['unit'], string>> = {
  en: { percent: '%', days: 'days', weeks: 'weeks', rm: 'RM' },
  zh: { percent: '%', days: '天', weeks: '周', rm: 'RM' },
};

const FILE_LABEL: Record<PackLang, Record<keyof typeof DEMO_FILE_NAMES, string>> = {
  en: { sales: 'Sales', products: 'Products', invoices: 'Supplier invoices', payments: 'Payments' },
  zh: { sales: '销售', products: '产品', invoices: '供应商发票', payments: '付款' },
};

/** UI strings of the pack. */
const T = {
  en: {
    colon: ':',
    docTitle: 'Rule review pack',
    title: 'Retail Profit Check — rule review pack',
    forWho: 'For the partner accountant, before the first paid pilot',
    meta: (p: Pack) => `Rules version ${p.rulesVersion} · ${RULES.length} rules · worked examples from the demo data: ${p.shopName}, ${p.period.from} to ${p.period.to}`,
    doesTitle: 'What the tool does',
    does: [
      'Reads a shop\'s own exports (sales, product/stock list, supplier invoices, optionally payments) inside the browser. Nothing is uploaded.',
      'Applies the rules in this pack and shows every finding with the rule that fired and the exact source rows.',
      'Lets an accountant mark each finding Confirmed, Not an issue or Needs info, and prints a one-page owner summary.',
    ],
    doesNotTitle: 'What it does not do',
    doesNot: [
      'It is not audited accounts, a review engagement or tax advice, and it does not replace an accountant.',
      'It does not value stock for the accounts (current cost, no net realisable value), separate SST, or know about rebates, credit notes, loans or tax payments.',
      'It does not prove that anything is wrong. Every finding is a possibility to check against documents. Accuracy has only been measured on synthetic data.',
    ],
    howTitle: 'How to review',
    how: [
      'For each rule, read the description and the worked example. Row numbers are spreadsheet rows in the demo files in demo/data/ (row 1 = header), so you can open them in Excel and check.',
      'Tick Agree, Change to (write the new number or wording) or Remove, and add notes, especially false positives you see in practice. The last page collects your decisions.',
      'Sign below. The founder changes src/rules/rules.config.ts and the app\'s Rules page to match before the first pilot, and gives you the new version number.',
    ],
    signTitle: 'Sign-off',
    signText: 'I have read every rule in this pack and recorded my decisions. This is a review of the tool\'s rules only. It is not an audit, review or other assurance engagement on any business\'s financial information.',
    signFields: ['Name', 'Professional body and membership no.', 'Firm', 'Signature', 'Date'],
    rule: 'Rule',
    kindFlag: 'Check (creates findings)',
    kindMethod: 'Method (describes a calculation; creates no findings)',
    severity: { high: 'High', medium: 'Medium', low: 'Low', info: '—' } as Record<string, string>,
    severityLabel: 'Severity',
    description: 'What it does',
    why: 'Why it matters',
    thresholds: 'Threshold',
    noThreshold: 'No editable threshold.',
    thresholdLine: (label: string, value: string, range: string) => `${label}: **${value}** (can be set from ${range})`,
    example: 'Worked example (demo data)',
    rowsOf: (file: string, name: string) => `${file} — demo/data/${name}`,
    rowCol: 'Row',
    moreRows: (shown: number, total: number, rows: string, csv: string) =>
      rows ? `Showing ${shown} of ${total} rows. All rows: ${rows} (also in evidence/${csv}).` : `Showing ${shown} of ${total} rows. All ${total} rows are in evidence/${csv}, with their row numbers.`,
    allRowsListed: (rows: string) => `Rows: ${rows}.`,
    falsePositives: 'Known false positives',
    falsePositivesMethod: 'Where the calculation is approximate',
    mayMiss: 'What it can miss',
    question: 'Question for you',
    decision: 'Your decision',
    agree: 'Agree',
    changeTo: 'Change to',
    remove: 'Remove this rule',
    changeWording: 'Change the method or wording',
    notes: 'Notes',
    summaryTitle: 'Summary of decisions',
    summaryIntro: 'Copy your decision for each rule here, so the changes can be made in one go.',
    summaryCols: ['Rule', 'Title', 'Current threshold', 'Agree / Change / Remove', 'New value or wording'],
    footer: 'Retail Profit Check · rule review pack · rules version',
  },
  zh: {
    colon: '：',
    docTitle: '规则审阅资料',
    title: 'Retail Profit Check — 规则审阅资料',
    forWho: '给合作会计师，在第一个付费试用之前审阅',
    meta: (p: Pack) => `规则版本 ${p.rulesVersion} · 共 ${RULES.length} 条规则 · 实例来自示范资料：${p.shopName}，${p.period.from} 至 ${p.period.to}`,
    doesTitle: '这个工具做什么',
    does: [
      '在浏览器里读取店铺自己导出的文件（销售、产品/库存清单、供应商发票，以及可选的付款）。不会上传任何资料。',
      '套用本资料中的规则，每项发现都显示触发的规则和具体的原始资料行。',
      '让会计师把每项发现标为“已确认”“没有问题”或“需要更多资料”，并打印一页的老板摘要。',
    ],
    doesNotTitle: '这个工具不做什么',
    doesNot: [
      '它不是经审计的账目、审阅业务或税务建议，也不能取代会计师。',
      '它不会为账目做存货估值（用当前成本，没有可变现净值），不会把 SST 分开，也不知道回扣、贷项通知单、贷款或税款。',
      '它不能证明任何事情有错。每项发现都只是需要对照单据核查的可能性。准确度目前只在虚构资料上测试过。',
    ],
    howTitle: '如何审阅',
    how: [
      '每条规则请阅读说明和实例。行号是 demo/data/ 里示范文件的电子表格行号（第 1 行是标题），您可以用 Excel 打开核对。',
      '勾选“同意”“改为”（写下新的数字或文字）或“删除”，并写下备注，特别是您在实务中见过的误报情况。最后一页汇总您的决定。',
      '在下方签名。创办人会在第一个试用之前，按照您的决定修改 src/rules/rules.config.ts 和应用程序的“规则”页面，并告诉您新的版本号。',
    ],
    signTitle: '签署',
    signText: '本人已阅读本资料中的每一条规则，并记录了我的决定。这只是对本工具规则的审阅，并不是对任何企业财务资料的审计、审阅或其他鉴证业务。',
    signFields: ['姓名', '专业团体及会员编号', '事务所', '签名', '日期'],
    rule: '规则',
    kindFlag: '检查（会产生发现）',
    kindMethod: '计算方法（说明计算方式；不会产生发现）',
    severity: { high: '高', medium: '中', low: '低', info: '—' } as Record<string, string>,
    severityLabel: '严重度',
    description: '规则内容',
    why: '为什么重要',
    thresholds: '门槛',
    noThreshold: '没有可修改的门槛。',
    thresholdLine: (label: string, value: string, range: string) => `${label}：**${value}**（可设定范围 ${range}）`,
    example: '实例（示范资料）',
    rowsOf: (file: string, name: string) => `${file} — demo/data/${name}`,
    rowCol: '行',
    moreRows: (shown: number, total: number, rows: string, csv: string) =>
      rows ? `显示 ${total} 行中的 ${shown} 行。所有行：${rows}（也在 evidence/${csv}）。` : `显示 ${total} 行中的 ${shown} 行。全部 ${total} 行连同行号都在 evidence/${csv}。`,
    allRowsListed: (rows: string) => `行号：${rows}。`,
    falsePositives: '已知的误报情况',
    falsePositivesMethod: '计算只是近似的地方',
    mayMiss: '可能漏掉的情况',
    question: '想请教您',
    decision: '您的决定',
    agree: '同意',
    changeTo: '改为',
    remove: '删除这条规则',
    changeWording: '修改计算方法或文字',
    notes: '备注',
    summaryTitle: '决定汇总',
    summaryIntro: '请把每条规则的决定抄在这里，方便一次过修改。',
    summaryCols: ['规则', '名称', '目前门槛', '同意 / 修改 / 删除', '新的数值或文字'],
    footer: 'Retail Profit Check · 规则审阅资料 · 规则版本',
  },
} as const;

type Texts = (typeof T)['en'];
const texts = (lang: PackLang): Texts => T[lang] as unknown as Texts;

function ruleText(r: RuleDef, lang: PackLang): { title: string; description: string; why: string } {
  if (lang === 'en') return { title: r.title, description: r.description, why: r.why };
  const z = (zhDict.ruleText as Record<string, { title: string; description: string; why: string }>)[r.id];
  return z ?? { title: r.title, description: r.description, why: r.why };
}

function thresholdLabel(th: ThresholdDef, lang: PackLang): string {
  return lang === 'en' ? th.label : ((zhDict.thresholdLabels as Record<string, string>)[th.key] ?? th.label);
}

export function thresholdValue(value: number, unit: ThresholdDef['unit'], lang: PackLang): string {
  const n = formatNum(value, lang, value % 1 === 0 ? 0 : 1);
  if (unit === 'rm') return `RM ${n}`;
  if (unit === 'percent') return `${n}%`;
  return lang === 'en' ? `${n} ${UNITS.en[unit]}` : `${n} ${UNITS.zh[unit]}`;
}

function thresholdLines(r: RuleDef, lang: PackLang): string[] {
  const x = texts(lang);
  return r.thresholds.map((th) =>
    x.thresholdLine(thresholdLabel(th, lang), thresholdValue(th.default, th.unit, lang), `${thresholdValue(th.min, th.unit, lang)} – ${thresholdValue(th.max, th.unit, lang)}`),
  );
}

/** Row numbers to print in full; long lists are left to the evidence CSV. */
export const MAX_LISTED_ROWS = 40;
const rowList = (rows: number[]) => (rows.length <= MAX_LISTED_ROWS ? compressRows(rows) : '');

// ---------------------------------------------------------------- Markdown

const mdCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function mdTable(header: readonly string[], rows: string[][]): string {
  return [`| ${header.map(mdCell).join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`)].join('\n');
}

function mdExampleTable(t: ExampleTable, lang: PackLang): string {
  const x = texts(lang);
  if (t.kind === 'calc') return `**${t.title[lang]}**\n\n${mdTable(t.header[lang], t.rows)}`;
  const head = `**${x.rowsOf(FILE_LABEL[lang][t.file], DEMO_FILE_NAMES[t.file])}**`;
  const table = mdTable([x.rowCol, ...t.header], t.rows.map((r) => [String(r.row), ...r.cells]));
  const note = t.csvName ? x.moreRows(t.rows.length, t.allRows.length, rowList(t.allRows), t.csvName) : '';
  return [head, table, note].filter(Boolean).join('\n\n');
}

function mdRule(r: RuleDef, ex: WorkedExample, lang: PackLang): string {
  const x = texts(lang);
  const rt = ruleText(r, lang);
  const n = RULE_NOTES[r.id];
  const ths = thresholdLines(r, lang);
  const change = r.thresholds.length
    ? r.thresholds.map((th) => `- [ ] ${x.changeTo}${x.colon} ______ ${th.unit === 'rm' ? 'RM' : UNITS[lang][th.unit]} (${thresholdLabel(th, lang)})`)
    : [`- [ ] ${x.changeWording}${x.colon} ____________________`];
  return [
    `## ${r.id} — ${rt.title}`,
    `*${r.kind === 'flag' ? x.kindFlag : x.kindMethod}${r.kind === 'flag' ? ` · ${x.severityLabel}${x.colon} ${x.severity[r.severity]}` : ''}*`,
    `**${x.description}${x.colon}** ${rt.description}`,
    `**${x.why}${x.colon}** ${rt.why}`,
    `**${x.thresholds}${x.colon}** ${ths.length ? '' : x.noThreshold}`,
    ...(ths.length ? [ths.map((l) => `- ${l}`).join('\n')] : []),
    `### ${x.example}`,
    ex.steps[lang].map((s, i) => `${i + 1}. ${s}`).join('\n'),
    ...ex.tables.map((t) => mdExampleTable(t, lang)),
    `### ${r.kind === 'flag' ? x.falsePositives : x.falsePositivesMethod}`,
    n.falsePositives[lang].map((s) => `- ${s}`).join('\n'),
    `### ${x.mayMiss}`,
    n.mayMiss[lang].map((s) => `- ${s}`).join('\n'),
    `### ${x.decision}`,
    `**${x.question}${x.colon}** ${n.question[lang]}`,
    [`- [ ] ${x.agree}`, ...change, `- [ ] ${x.remove}`].join('\n'),
    `**${x.notes}${x.colon}**\n\n> &nbsp;\n>\n> &nbsp;\n>\n> &nbsp;`,
  ].join('\n\n');
}

export function renderMarkdown(pack: Pack, lang: PackLang): string {
  const x = texts(lang);
  const cover = [
    `# ${x.title}`,
    `*${x.forWho}.* ${x.meta(pack)}`,
    `## ${x.doesTitle}`,
    x.does.map((s) => `- ${s}`).join('\n'),
    `## ${x.doesNotTitle}`,
    x.doesNot.map((s) => `- ${s}`).join('\n'),
    `## ${x.howTitle}`,
    x.how.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    `## ${x.signTitle}`,
    x.signText,
    x.signFields.map((f) => `- ${f}${x.colon} ______________________________`).join('\n'),
  ].join('\n\n');
  const rules = RULES.map((r) => mdRule(r, pack.examples[r.id], lang));
  const summary = [
    `## ${x.summaryTitle}`,
    x.summaryIntro,
    mdTable(x.summaryCols, RULES.map((r) => [r.id, ruleText(r, lang).title, thresholdSummary(r, lang), '', ''])),
  ].join('\n\n');
  return `${[cover, ...rules, summary].join('\n\n---\n\n')}\n`;
}

function thresholdSummary(r: RuleDef, lang: PackLang): string {
  return r.thresholds.map((th) => `${thresholdLabel(th, lang)} ${thresholdValue(th.default, th.unit, lang)}`).join('; ') || '—';
}

// ---------------------------------------------------------------- HTML

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Escape, then turn **bold** into <strong>. */
const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const list = (items: readonly string[], ordered = false) => `<${ordered ? 'ol' : 'ul'}>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;

function htmlTable(header: readonly string[], rows: string[][], cls = ''): string {
  return `<table class="${cls}"><thead><tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function htmlExampleTable(t: ExampleTable, lang: PackLang): string {
  const x = texts(lang);
  if (t.kind === 'calc') return `<p class="tcap">${escapeHtml(t.title[lang])}</p>${htmlTable(t.header[lang], t.rows, 'rows')}`;
  const note = t.csvName ? x.moreRows(t.rows.length, t.allRows.length, rowList(t.allRows), t.csvName) : '';
  return `<p class="tcap">${escapeHtml(x.rowsOf(FILE_LABEL[lang][t.file], DEMO_FILE_NAMES[t.file]))}</p>${htmlTable([x.rowCol, ...t.header], t.rows.map((r) => [String(r.row), ...r.cells]), 'rows')}${note ? `<p class="small">${escapeHtml(note)}</p>` : ''}`;
}

function htmlRule(r: RuleDef, ex: WorkedExample, lang: PackLang): string {
  const x = texts(lang);
  const rt = ruleText(r, lang);
  const n = RULE_NOTES[r.id];
  const ths = thresholdLines(r, lang);
  const changes = r.thresholds.length
    ? r.thresholds.map((th) => `<div class="opt"><span class="box"></span>${escapeHtml(x.changeTo)} <span class="blank"></span> ${escapeHtml(th.unit === 'rm' ? 'RM' : UNITS[lang][th.unit])} <span class="muted">(${escapeHtml(thresholdLabel(th, lang))})</span></div>`)
    : [`<div class="opt"><span class="box"></span>${escapeHtml(x.changeWording)} <span class="blank wide"></span></div>`];
  return `<section class="rule" id="${r.id}">
<h2><span class="rid">${r.id}</span> ${escapeHtml(rt.title)}</h2>
<p class="kind">${escapeHtml(r.kind === 'flag' ? x.kindFlag : x.kindMethod)}${r.kind === 'flag' ? ` · ${escapeHtml(x.severityLabel)}${x.colon} ${escapeHtml(x.severity[r.severity] ?? '')}` : ''}</p>
<p><strong>${escapeHtml(x.description)}${x.colon}</strong> ${escapeHtml(rt.description)}</p>
<p><strong>${escapeHtml(x.why)}${x.colon}</strong> ${escapeHtml(rt.why)}</p>
<p><strong>${escapeHtml(x.thresholds)}${x.colon}</strong> ${ths.length ? '' : escapeHtml(x.noThreshold)}</p>${ths.length ? list(ths) : ''}
<h3>${escapeHtml(x.example)}</h3>
${list(ex.steps[lang], true)}
${ex.tables.map((t) => htmlExampleTable(t, lang)).join('\n')}
<div class="two">
<div><h3>${escapeHtml(r.kind === 'flag' ? x.falsePositives : x.falsePositivesMethod)}</h3>${list(n.falsePositives[lang])}</div>
<div><h3>${escapeHtml(x.mayMiss)}</h3>${list(n.mayMiss[lang])}</div>
</div>
<div class="decision">
<h3>${escapeHtml(x.decision)}</h3>
<p><strong>${escapeHtml(x.question)}${x.colon}</strong> ${escapeHtml(n.question[lang])}</p>
<div class="opt"><span class="box"></span>${escapeHtml(x.agree)}</div>
${changes.join('\n')}
<div class="opt"><span class="box"></span>${escapeHtml(x.remove)}</div>
<p class="notes-label">${escapeHtml(x.notes)}${x.colon}</p>
<div class="lines"><div></div><div></div><div></div><div></div></div>
</div>
</section>`;
}

const CSS = `
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif; font-size: 9.5pt; line-height: 1.4; color: #1a1a1a; background: #fff; margin: 0; }
main { max-width: 190mm; margin: 0 auto; padding: 8mm 0; }
h1 { font-size: 18pt; margin: 0 0 2mm; }
h2 { font-size: 13pt; margin: 0 0 1.5mm; border-bottom: 1.5px solid #1f4e79; padding-bottom: 1mm; }
h3 { font-size: 10pt; margin: 3mm 0 1mm; color: #1f4e79; }
p { margin: 1mm 0; }
ul, ol { margin: 1mm 0 1mm 5mm; padding: 0; }
li { margin: 0.4mm 0; }
.rid { display: inline-block; background: #1f4e79; color: #fff; border-radius: 3px; padding: 0 2mm; margin-right: 1mm; font-size: 11pt; }
.kind, .muted, .meta { color: #555; }
.small { font-size: 8pt; color: #444; }
.tcap { font-weight: 600; margin-top: 2mm; font-size: 8.5pt; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0; }
th, td { border: 0.5px solid #999; padding: 0.6mm 1.2mm; text-align: left; vertical-align: top; }
th { background: #e8eef5; }
table.rows { font-size: 7.3pt; }
table.rows td { overflow-wrap: anywhere; }
.two { display: grid; grid-template-columns: 1.4fr 1fr; gap: 5mm; }
.decision { border: 1.5px solid #1f4e79; border-radius: 2mm; padding: 2mm 3mm; margin-top: 3mm; break-inside: avoid; }
.decision h3 { margin-top: 0; }
.opt { margin: 1.5mm 0; }
.box { display: inline-block; width: 3.6mm; height: 3.6mm; border: 1px solid #222; margin-right: 2mm; vertical-align: -0.6mm; }
.blank { display: inline-block; width: 28mm; border-bottom: 1px solid #222; height: 3.5mm; }
.blank.wide { width: 100mm; }
.notes-label { margin-top: 2mm; }
.lines div { border-bottom: 1px solid #aaa; height: 6.5mm; }
.cover { min-height: 255mm; }
.cover h2 { font-size: 11.5pt; margin-top: 4mm; }
.sign { border: 1.5px solid #1f4e79; border-radius: 2mm; padding: 2mm 4mm; margin-top: 4mm; }
.sign .field { display: grid; grid-template-columns: 60mm 1fr; align-items: end; height: 8mm; }
.sign .field span:last-child { border-bottom: 1px solid #222; height: 6mm; }
section.rule, section.summary { break-before: page; }
table.summary td { height: 9mm; }
table.summary td:first-child, table.summary th:first-child { white-space: nowrap; }
@media screen { main { padding: 10mm; } section.rule, section.summary { border-top: 3px dashed #ccc; padding-top: 6mm; margin-top: 10mm; } }
`;

export function renderHtml(pack: Pack, lang: PackLang): string {
  const x = texts(lang);
  const cover = `<section class="cover">
<h1>${escapeHtml(x.title)}</h1>
<p><strong>${escapeHtml(x.forWho)}.</strong></p>
<p class="meta">${escapeHtml(x.meta(pack))}</p>
<h2>${escapeHtml(x.doesTitle)}</h2>${list(x.does)}
<h2>${escapeHtml(x.doesNotTitle)}</h2>${list(x.doesNot)}
<h2>${escapeHtml(x.howTitle)}</h2>${list(x.how, true)}
<div class="sign"><h2>${escapeHtml(x.signTitle)}</h2><p>${escapeHtml(x.signText)}</p>
${x.signFields.map((f) => `<div class="field"><span>${escapeHtml(f)}</span><span></span></div>`).join('\n')}
</div>
</section>`;
  const rules = RULES.map((r) => htmlRule(r, pack.examples[r.id], lang)).join('\n');
  const summary = `<section class="summary"><h2>${escapeHtml(x.summaryTitle)}</h2><p>${escapeHtml(x.summaryIntro)}</p>${htmlTable(
    x.summaryCols,
    RULES.map((r) => [r.id, ruleText(r, lang).title, thresholdSummary(r, lang), '', '']),
    'summary',
  )}</section>`;
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-Hans' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(x.docTitle)} · ${pack.rulesVersion}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${cover}
${rules}
${summary}
</main>
</body>
</html>
`;
}

/** Footer for the PDF (Chromium header/footer template). */
export function pdfFooter(pack: Pack, lang: PackLang): string {
  return `<div style="font-size:7pt;color:#666;width:100%;padding:0 13mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>${escapeHtml(texts(lang).footer)} ${pack.rulesVersion}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
}
