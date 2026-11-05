/**
 * The three pitches, their tracking codes and the call-to-action line.
 * The code (PROFIT / STOCK / INVOICE) travels in the WhatsApp link (?text=CODE) or the
 * m.me link (?ref=CODE), so a lead can be attributed to the pitch that brought them in.
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

const PITCHES = [
  {
    id: 'profit_by_product',
    code: 'PROFIT',
    en: 'Profit by product',
    zh: '每样货到底赚多少',
    angle:
      'Which products really make money. Some items may sell below cost or under the target margin (default 25%) and nobody notices until year-end.',
  },
  {
    id: 'cash_in_stock',
    code: 'STOCK',
    en: 'Cash stuck in stock',
    zh: '现金压在货架上',
    angle:
      'Cash sitting on the shelf as slow or dead stock (no sale in 90+ days), and how many days of stock each item has left.',
  },
  {
    id: 'supplier_invoice',
    code: 'INVOICE',
    en: 'Supplier invoice mistakes',
    zh: '供应商发票出错',
    angle:
      'Possible duplicate supplier invoices, unit-price increases above 5%, and invoices that may have been paid twice. Honest mistakes, found before year-end.',
  },
];

function pitchById(id) {
  return PITCHES.find((p) => p.id === id) || null;
}

function pitchByCode(code) {
  const upper = String(code || '').trim().toUpperCase();
  return PITCHES.find((p) => p.code === upper) || null;
}

/** Rotate the pitch order by ISO week so each pitch gets each weekday slot in turn. */
function pitchOrderForWeek(week) {
  const k = ((Number(week) % PITCHES.length) + PITCHES.length) % PITCHES.length;
  return PITCHES.slice(k).concat(PITCHES.slice(0, k));
}

/**
 * Which pitch brought this lead in? m.me ref first, then a code typed or pre-filled in
 * the message ("STOCK", "(ref: STOCK)"). Codes must be upper case unless after "ref",
 * so ordinary words like "my stock" do not count.
 */
function detectPitch(text, referralRef) {
  const fromRef = pitchByCode(referralRef);
  if (fromRef) return fromRef.id;
  const value = String(text || '');
  const refMatch = value.match(/\bref\s*[:#-]?\s*(profit|stock|invoice)\b/i);
  if (refMatch) return pitchByCode(refMatch[1]).id;
  const codeMatch = value.match(/(?:^|[^A-Za-z])(PROFIT|STOCK|INVOICE)(?![A-Za-z])/);
  if (codeMatch) return pitchByCode(codeMatch[1]).id;
  return 'unknown';
}

/** The call-to-action added to every post by code (never written by the LLM). */
function buildCta(pitch, language, whatsappNumber) {
  const link = `https://wa.me/${whatsappNumber}?text=${pitch.code}`;
  if (language === 'zh') {
    return `👉 免费聊 15 分钟，或者看 5 分钟示范（用虚构的样本店）。WhatsApp 我们：${link}（或者直接传 "${pitch.code}"）`;
  }
  if (language === 'ms') {
    return `👉 Sembang percuma 15 minit, atau demo 5 minit (kedai contoh rekaan). WhatsApp kami: ${link} (atau hantar "${pitch.code}")`;
  }
  return `👉 Free 15-min chat, or a 5-min demo on a fictional sample shop. WhatsApp us: ${link} (or just send "${pitch.code}")`;
}

/* @export-start */
module.exports = { PITCHES, pitchById, pitchByCode, pitchOrderForWeek, detectPitch, buildCta };
/* @export-end */
