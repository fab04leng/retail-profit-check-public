/**
 * Brand-rule checks for any text that could be published or sent
 * (social posts and lead replies). Machine-checkable rules from brand-rules.md.
 *
 * BLOCK rules: the text must never go out. The publisher and the reply sender
 * re-run this check on the text as it is in the sheet at send time, so an
 * approved row that breaks a BLOCK rule is still refused.
 * CHECK rules: warnings for the human reviewer; they never stop publishing.
 *
 * Plain functions only (no require): the build inlines this file into n8n Code nodes.
 */

// Words that, shortly before a match, turn it into an honest disclaimer
// ("not tax advice", "we can't guarantee", "不是税务建议", "bukan nasihat cukai").
// English/Malay negators may sit a few words earlier; Chinese ones must be (almost) adjacent,
// because 不 is common and "老板不用担心，我们保证…" must still be blocked.
const NEGATION_BEFORE = /(?:\b(?:not|no|never|cannot|can[’']t|can not|don[’']t|do not|won[’']t|isn[’']t|aren[’']t|without|bukan|tidak|tak)\b[^.!?。！？\n]{0,24}|(?:不是|并非|不提供|不能|无法|没有|不会|不敢|不)[^。！？\n]{0,2})$/i;

const BLOCK_RULES = [
  {
    id: 'B1',
    label: 'accusation word (fraud/cheat/steal) – say "mistakes" or "possible duplicates"',
    patterns: [
      /\bfraud\w*/i, /\bscam\w*/i, /\bcheat\w*/i, /\bsteal\w*/i, /\bstole\b/i, /\btheft\b/i, /\bembezzl\w*/i,
      /欺诈|诈骗|舞弊|造假|作弊|偷钱|偷货|骗钱|骗子|贪污/,
      /\bpenipuan\b|\bpenipu\b|\bmenipu\b|\bcuri\b/i,
    ],
    negatable: false,
  },
  {
    id: 'B2',
    label: 'claims to replace the accountant – we work with, not instead of, an accountant',
    patterns: [
      /\breplac\w*\s+(?:your\s+|an?\s+|the\s+)?accountants?\b/i,
      /\bno\s+(?:more\s+)?need\s+(?:for\s+|of\s+)?(?:an?\s+|your\s+)?accountants?\b/i,
      /\b(?:instead\s+of|without)\s+(?:an?\s+|your\s+)?accountants?\b/i,
      /\baccountants?\s+(?:is|are)\s+(?:not\s+needed|unnecessary|obsolete)\b/i,
      /\bfire\s+(?:your\s+)?accountants?\b/i,
      /取代会计|代替会计|替代会计|不需要会计|不用请会计|不必请会计|省掉会计|炒掉会计/,
      /\bganti(?:kan)?\s+akauntan\b|\btak\s+perlu\s+akauntan\b|\btidak\s+perlu\s+akauntan\b/i,
    ],
    negatable: false,
  },
  {
    id: 'B3',
    label: 'tax advice or tax-saving claim – we do not give tax advice',
    patterns: [
      /\b(?:save|saving|saves|reduce|reducing|cut|lower|minimi[sz]e)\w*\s+(?:on\s+)?(?:your\s+)?tax(?:es)?\b/i,
      /\btax\s+(?:advice|saving|savings|deduction|deductions|relief|planning|tips?|refunds?|exemptions?|benefits?)\b/i,
      /\b(?:LHDN|IRBM?|inland\s+revenue)\b/i,
      /\be-?invoic\w*\b|\be-?invois\w*\b/i,
      /省税|节税|避税|扣税|减税|报税|退税|税务(?:建议|规划|优化|咨询)|电子发票|国税局|内陆税收局/,
      /\bnasihat\s+cukai\b|\bjimat\s+cukai\b|\bpelepasan\s+cukai\b/i,
    ],
    negatable: true,
  },
  {
    id: 'B4',
    label: 'guaranteed result or promised saving – findings are possibilities only',
    patterns: [
      /\bguarantee\w*/i,
      /\b100\s?%\s*(?:accurate|guaranteed|sure|safe|correct)\b/i,
      /\b(?:will|definitely)\s+(?:save|find|recover|increase)\s+(?:you\s+)?(?:at\s+least\s+)?RM/i,
      /\bpromise\w*\s+(?:to\s+)?(?:save|saving|savings|profit|find)\b/i,
      /保证|包你|包赚|一定(?:能|会|可以)(?:省|赚|找到|帮你)|百分百(?:准确|有效)/,
      /\bdijamin\b|\bjaminan\b/i,
    ],
    negatable: true,
  },
  {
    id: 'B5',
    label: 'calls the product AI – the checks are plain rules, no AI',
    patterns: [
      /\bAI[-\s]?(?:powered|driven|based|tool|system|software|engine|analysis|checks?)\b/i,
      /\bartificial\s+intelligence\b/i,
      /\bmachine\s+learning\b/i,
      /人工智能|AI\s?(?:分析|帮你|自动|系统|软件|工具)/,
      /\bkecerdasan\s+buatan\b/i,
    ],
    negatable: true,
  },
  {
    id: 'B6',
    label: 'claims audited accounts or an audit – this is an analysis aid',
    patterns: [
      /\baudit(?:ed|s)?\s+(?:accounts?|reports?|financials?|statements?)\b/i,
      /\b(?:we|our\s+team|it)\s+audits?\b/i,
      /审计报告|帮你审计|做审计/,
      /\bakaun\s+diaudit\b/i,
    ],
    negatable: true,
  },
  {
    id: 'B7',
    label: 'contains an email address – never put personal contact details in posts or replies',
    patterns: [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
    negatable: false,
  },
  {
    id: 'B8',
    label: 'placeholder left in the text – fill in config before publishing',
    patterns: [/PLACEHOLDER/i, /60X{6,}/i, /\[(?:Name|your name|day\/time)\]/i],
    negatable: false,
  },
];

// Malaysian mobile/landline-looking numbers. Our own WhatsApp number is allowed.
const PHONE_PATTERN = /(?:\+?6?0)[1-9][\d\s-]{7,11}\d/g;

const CHECK_RULES = [
  {
    id: 'W1',
    label: 'RM amount without a "demo data" label – label it, or remove it',
    test: (text) => {
      const withoutPricing = text.replace(/RM\s?300(?:\s?[–-]\s?RM\s?800)?(?!\d)/gi, '').replace(/RM\s?800(?!\d)/gi, '');
      return /RM\s?\d/i.test(withoutPricing) && !hasDemoLabel(text);
    },
  },
  {
    id: 'W2',
    label: 'percentage or statistic – only use it if it comes from the brief, or label it as demo data',
    test: (text) => /\d{1,3}(?:\.\d+)?\s?%/.test(text.replace(/\b25\s?%/g, '').replace(/\b5\s?%/g, '')) && !hasDemoLabel(text),
  },
  {
    id: 'W3',
    label: 'pressure wording – keep the tone calm and helpful',
    test: (text) => /\b(?:act\s+now|last\s+chance|before\s+it'?s\s+too\s+late|hurry|limited\s+time|don'?t\s+miss)\b|赶快|赶紧|最后机会|错过就|限时|\bsegera\b|\bpeluang\s+terakhir\b/i.test(text),
  },
  {
    id: 'W4',
    label: 'more than 4 hashtags',
    test: (text) => (text.match(/#[^\s#]+/g) || []).length > 4,
  },
  {
    id: 'W5',
    label: 'longer than the brief allows',
    test: (text, opts) => text.length > (opts.maxLength || 1300),
  },
  {
    id: 'W6',
    label: 'names a specific shop, brand or supplier? Check it is fictional or that you have permission',
    test: (text) => /\b(?:Sdn\.?\s*Bhd\.?|Bhd\.?|Enterprise|Trading)\b|有限公司/i.test(text),
  },
];

function hasDemoLabel(text) {
  return /\b(?:demo|sample|fictional|made[-\s]up|example)\b|示范|样本|虚构|假设|例子|\bcontoh\b/i.test(text);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function findPhoneIssues(text, allowedPhones) {
  const allowed = new Set((allowedPhones || []).map(digitsOnly).filter(Boolean));
  const issues = [];
  for (const match of text.match(PHONE_PATTERN) || []) {
    const digits = digitsOnly(match);
    if (digits.length < 9 || digits.length > 12) continue;
    const normalised = digits.startsWith('0') ? '6' + digits : digits;
    if (allowed.has(digits) || allowed.has(normalised)) continue;
    issues.push(match.trim());
  }
  return issues;
}

/**
 * @param {string} text  the exact text that would be published or sent
 * @param {{allowedPhones?: string[], maxLength?: number}} [opts]
 * @returns {{block: {id:string,label:string,match:string}[], warn: {id:string,label:string}[]}}
 */
function checkCompliance(text, opts) {
  const options = opts || {};
  const value = String(text || '');
  const block = [];
  for (const rule of BLOCK_RULES) {
    let hit = null;
    for (const pattern of rule.patterns) {
      const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let m;
      while ((m = re.exec(value)) !== null) {
        const before = value.slice(Math.max(0, m.index - 40), m.index);
        if (!(rule.negatable && NEGATION_BEFORE.test(before))) {
          hit = m[0];
          break;
        }
        if (m[0].length === 0) re.lastIndex += 1;
      }
      if (hit) break;
    }
    if (hit) block.push({ id: rule.id, label: rule.label, match: hit });
  }
  const phones = findPhoneIssues(value, options.allowedPhones);
  if (phones.length) {
    block.push({ id: 'B9', label: 'phone number that is not our WhatsApp number – no personal data in posts or replies', match: phones[0] });
  }
  const warn = CHECK_RULES.filter((rule) => rule.test(value, options)).map((rule) => ({ id: rule.id, label: rule.label }));
  return { block, warn };
}

/** One-line summary for the sheet's compliance_flags column ('' when clean). */
function formatFlags(result) {
  const parts = [];
  for (const b of result.block) parts.push(`BLOCK ${b.id}: ${b.label} ("${b.match}")`);
  for (const w of result.warn) parts.push(`CHECK ${w.id}: ${w.label}`);
  return parts.join(' | ');
}

/* @export-start */
module.exports = { checkCompliance, formatFlags, hasDemoLabel, digitsOnly, BLOCK_RULES, CHECK_RULES };
/* @export-end */
