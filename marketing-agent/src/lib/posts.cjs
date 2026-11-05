/**
 * Content generator and publisher logic for the "posts" tab.
 * Plain functions only: inlined into n8n Code nodes by the build (together with
 * dates.cjs, pitches.cjs, compliance.cjs, config.cjs and llm.cjs).
 */

/* @import-start */
const { isoWeekWithOffset, weekId, slotDateTime, parseMyt, formatMyt } = require('./dates.cjs');
const { pitchById, pitchOrderForWeek, buildCta } = require('./pitches.cjs');
const { checkCompliance, formatFlags } = require('./compliance.cjs');
const { listSetting } = require('./config.cjs');
/* @import-end */

const POST_COLUMNS = [
  'post_id', 'week', 'slot', 'scheduled_for', 'pitch', 'language', 'channels', 'status', 'text', 'image_idea',
  'image_url', 'compliance_flags', 'reviewer_notes', 'fb_post_id', 'ig_media_id', 'published_at', 'error', 'created_at',
];
const SUPPORTED_LANGUAGES = ['en', 'zh', 'ms'];
const SUPPORTED_CHANNELS = ['facebook', 'instagram'];
const MAX_BODY_CHARS = { en: 900, zh: 450, ms: 900 };
const MAX_HASHTAGS = 4;
const STATUS = {
  needsApproval: 'needs approval',
  approved: 'approved',
  publishing: 'publishing',
  posted: 'posted',
  postedDryRun: 'posted (dry run)',
  blocked: 'blocked',
  needsImage: 'needs image',
  error: 'error',
};

function normaliseStatus(value) {
  return String(value || '').trim().toLowerCase();
}

/** The week's slots: one per POST_DAYS entry, pitches rotated by ISO week. */
function buildSlots(config, now) {
  const isoWeek = isoWeekWithOffset(now, config.WEEK_OFFSET);
  const days = String(config.POST_DAYS).split(/[,;\s]+/).filter(Boolean);
  if (!days.length) throw new Error('POST_DAYS is empty. Example: Mon,Wed,Fri');
  const order = pitchOrderForWeek(isoWeek.week);
  const slots = days.map((day, i) => ({
    slot: i + 1,
    day,
    pitch: order[i % order.length].id,
    scheduled_for: slotDateTime(isoWeek, day, config.POST_TIME),
  }));
  return { week: weekId(isoWeek), slots };
}

function languagesFrom(config) {
  const languages = listSetting(config.LANGUAGES).filter((l) => SUPPORTED_LANGUAGES.includes(l));
  if (!languages.length) throw new Error('LANGUAGES must list en, zh and/or ms (example: en,zh).');
  return languages;
}

const LANGUAGE_GUIDE = {
  en: 'English: plain, warm, short sentences, Malaysian context (RM, kopitiam, mall shops). No jargon.',
  zh: 'Casual Malaysian Chinese (简体中文, 大马口语): talk like a friendly local accountant to a shop 老板. Light code-mixing is fine (stock, invoice, cash flow). Particles like 啦/咯/哦 at most twice. Not a translation of the English post: write it natively. No Mainland internet slang (亲, 家人们, 宝子, 老铁) and no Taiwan wording.',
  ms: 'Bahasa Melayu santai yang sopan, ayat pendek, sesuai untuk pemilik kedai runcit di Malaysia.',
};

function buildContentMessages(input) {
  const pitchLines = input.slots
    .map((s) => {
      const p = pitchById(s.pitch);
      return `- slot ${s.slot} (${s.day}, ${s.scheduled_for} Malaysia time): pitch "${p.id}" – ${p.en} / ${p.zh}. Angle: ${p.angle}`;
    })
    .join('\n');
  const system = [
    'You write organic social media posts (Facebook Page and Instagram) for "Retail Profit Check".',
    'Follow the BRAND RULES exactly. If the brief and the brand rules disagree, the brand rules win.',
    'Every post is a draft that a human will approve before anything is published.',
    '',
    '=== BRAND RULES ===',
    input.brandRules || '(brand rules not loaded – be conservative: no claims, no numbers, no tax topics)',
    '',
    '=== CONTENT BRIEF ===',
    input.brief || '(content brief not loaded)',
  ].join('\n');
  const user = [
    `Write this week's posts (${input.week}). One post per slot, in each of these languages: ${input.languages.join(', ')}.`,
    pitchLines,
    '',
    'Language guide:',
    ...input.languages.map((l) => `- ${l}: ${LANGUAGE_GUIDE[l]}`),
    '',
    'Rules for the output:',
    `- body: the post text only. At most ${MAX_BODY_CHARS.en} characters for en/ms and ${MAX_BODY_CHARS.zh} for zh.`,
    '- Do NOT write a call to action, link, phone number or price: the system adds the call to action.',
    '- Any RM figure or percentage must be clearly labelled as demo data from a fictional sample shop.',
    `- hashtags: 0 to ${MAX_HASHTAGS}, each starting with #, no spaces.`,
    '- image_idea: one sentence describing an image the owner can make (for example a demo screenshot). Images must only show demo data with the "Demo data" label visible.',
    '',
    'Reply with JSON only, in exactly this shape:',
    '{"posts":[{"slot":1,"pitch":"<pitch id>","image_idea":"...",' +
      input.languages.map((l) => `"${l}":{"body":"...","hashtags":["#..."]}`).join(',') +
      '}]}',
  ].join('\n');
  return { system, user };
}

function cleanHashtags(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((h) => String(h || '').trim().replace(/\s+/g, ''))
    .map((h) => (h.startsWith('#') ? h : '#' + h))
    .filter((h) => /^#[\p{L}\p{N}_]{2,40}$/u.test(h))
    .slice(0, MAX_HASHTAGS);
}

/** Flags for one post: BLOCK rules on the full text; demo-label warnings on the body alone
 *  (the call-to-action mentions "fictional sample shop", which must not count as a label). */
function postFlags(body, fullText, whatsappNumber) {
  const opts = { allowedPhones: [whatsappNumber] };
  const full = checkCompliance(fullText, opts);
  const bodyOnly = checkCompliance(body, opts);
  const labelRules = ['W1', 'W2'];
  const warn = full.warn
    .filter((w) => !labelRules.includes(w.id))
    .concat(bodyOnly.warn.filter((w) => labelRules.includes(w.id)));
  return formatFlags({ block: full.block, warn });
}

/** Turn the parsed LLM JSON into sheet rows (status "needs approval"). */
function postsToRows(parsed, plan, config, now) {
  if (!parsed || !Array.isArray(parsed.posts)) throw new Error('LLM JSON has no "posts" array.');
  const languages = languagesFrom(config);
  const channels = listSetting(config.DEFAULT_CHANNELS).filter((c) => SUPPORTED_CHANNELS.includes(c)).join(',');
  const createdAt = formatMyt(now);
  const rows = [];
  for (const slot of plan.slots) {
    const post = parsed.posts.find((p) => Number(p.slot) === slot.slot);
    if (!post) throw new Error(`LLM JSON is missing slot ${slot.slot}.`);
    const pitch = pitchById(slot.pitch);
    for (const language of languages) {
      const part = post[language];
      const body = part && typeof part.body === 'string' ? part.body.trim() : '';
      if (!body) throw new Error(`LLM JSON is missing the ${language} body for slot ${slot.slot}.`);
      const hashtags = cleanHashtags(part.hashtags);
      const text = [body, buildCta(pitch, language, config.WHATSAPP_NUMBER), hashtags.join(' ')].filter(Boolean).join('\n\n');
      let flags = postFlags(body, text, config.WHATSAPP_NUMBER);
      if (body.length > MAX_BODY_CHARS[language]) {
        flags = [flags, `CHECK W5: body is ${body.length} characters (limit ${MAX_BODY_CHARS[language]})`].filter(Boolean).join(' | ');
      }
      rows.push({
        post_id: `${plan.week}-${slot.slot}-${language}`,
        week: plan.week,
        slot: slot.slot,
        scheduled_for: slot.scheduled_for,
        pitch: pitch.id,
        language,
        channels,
        status: STATUS.needsApproval,
        text,
        image_idea: `${String(post.image_idea || 'Demo screenshot').trim()} (Only demo data; keep the "Demo data" label visible. Instagram needs a public JPEG link in image_url.)`,
        image_url: '',
        compliance_flags: flags,
        reviewer_notes: '',
        fb_post_id: '',
        ig_media_id: '',
        published_at: '',
        error: '',
        created_at: createdAt,
      });
    }
  }
  return rows;
}

/** Canned posts in the same JSON shape as the LLM, for testing without an API key. */
function fakeContent(plan, languages) {
  const samples = {
    profit_by_product: {
      en: 'Busy month, good sales… but which products actually made money? In our demo shop (fictional data), 3 items were selling below cost and nobody noticed. A quick check of your own sales and cost list shows this product by product.',
      zh: '生意忙，卖得也不错，可是到底哪样货真的有赚？我们的示范店（虚构数据）里，有 3 样货原来低过成本在卖，一直没人发现。用你自己的销售和成本资料，一样一样看清楚。',
      ms: 'Jualan bagus bulan ini… tapi produk mana yang betul-betul untung? Dalam kedai demo kami (data rekaan), 3 barang dijual bawah kos tanpa disedari.',
    },
    cash_in_stock: {
      en: 'Cash does not only sit in the bank. Some of it sits on your shelves. In our demo shop (fictional data), almost a fifth of stock value had not sold in 90 days. Knowing which items helps you plan your next order.',
      zh: '钱不只是在银行，有一些其实压在货架上。我们的示范店（虚构数据）里，差不多五分之一的库存 90 天都没卖出。知道是哪些货，下次订货就比较有数。',
      ms: 'Wang bukan hanya di bank. Sebahagiannya ada di rak kedai. Dalam kedai demo kami (data rekaan), banyak stok tidak terjual dalam 90 hari.',
    },
    supplier_invoice: {
      en: 'Same supplier, same amount, two invoice numbers, one week apart. Honest mistakes like this happen in busy shops. Our checks list possible duplicates and price increases so you can ask the supplier before you pay.',
      zh: '同一个供应商，同样的金额，两张不同号码的发票，相隔一个星期。生意忙的时候，这种小错很常见。我们的检查会列出可能重复的发票和涨价的货，让你付钱前先问清楚。',
      ms: 'Pembekal sama, jumlah sama, dua nombor invois, seminggu berbeza. Kesilapan begini biasa berlaku. Semakan kami senaraikan invois yang mungkin berganda.',
    },
  };
  const tags = { en: ['#RetailMalaysia', '#SmallBusinessMY'], zh: ['#大马零售', '#老板必看'], ms: ['#RuncitMalaysia'] };
  return {
    posts: plan.slots.map((slot) => {
      const post = { slot: slot.slot, pitch: slot.pitch, image_idea: `Demo screenshot of the ${pitchById(slot.pitch).en} page` };
      for (const l of languages) post[l] = { body: `[FAKE LLM TEST] ${samples[slot.pitch][l]}`, hashtags: tags[l] };
      return post;
    }),
  };
}

/** Sort key: empty or unreadable dates first (they are handled, or reported, before dated rows). */
function timeOf(value) {
  const d = parseMyt(value);
  return d ? d.getTime() : 0;
}

function parseChannels(value, config) {
  const list = listSetting(value || config.DEFAULT_CHANNELS);
  const unknown = list.filter((c) => !SUPPORTED_CHANNELS.includes(c));
  return { list: list.filter((c) => SUPPORTED_CHANNELS.includes(c)), unknown };
}

/**
 * Publisher: from all rows, the single next approved, due post to publish (oldest slot
 * first) plus status updates for approved rows that must not be published as they are.
 */
function pickNextPost(rows, now, config) {
  const updates = [];
  let publish = null;
  const approved = (rows || [])
    .filter((r) => r && r.post_id && normaliseStatus(r.status) === STATUS.approved)
    .sort((a, b) => timeOf(a.scheduled_for) - timeOf(b.scheduled_for) || String(a.post_id).localeCompare(String(b.post_id)));
  for (const row of approved) {
    const due = parseMyt(row.scheduled_for);
    if (row.scheduled_for && !due) {
      updates.push({ post_id: row.post_id, status: STATUS.error, error: `Cannot read scheduled_for "${row.scheduled_for}". Use YYYY-MM-DD HH:mm (Malaysia time).` });
      continue;
    }
    if (due && due.getTime() > now.getTime()) continue;
    const text = String(row.text || '').trim();
    if (!text) {
      updates.push({ post_id: row.post_id, status: STATUS.error, error: 'text is empty.' });
      continue;
    }
    const check = checkCompliance(text, { allowedPhones: [config.WHATSAPP_NUMBER] });
    if (check.block.length) {
      updates.push({
        post_id: row.post_id,
        status: STATUS.blocked,
        compliance_flags: formatFlags({ block: check.block, warn: [] }),
        error: 'Blocked at publish time by a brand rule. Edit the text, then set status to approved again.',
      });
      continue;
    }
    if (/\[FAKE LLM TEST\]/.test(text) && !config.DRY_RUN) {
      updates.push({ post_id: row.post_id, status: STATUS.blocked, error: 'This is a fake test post. It can only be published with DRY_RUN = TRUE.' });
      continue;
    }
    const channels = parseChannels(row.channels, config);
    if (channels.unknown.length || !channels.list.length) {
      updates.push({ post_id: row.post_id, status: STATUS.error, error: `channels must be facebook and/or instagram, got "${row.channels}".` });
      continue;
    }
    const imageUrl = String(row.image_url || '').trim();
    if (imageUrl && !/^https:\/\/\S+$/i.test(imageUrl)) {
      updates.push({ post_id: row.post_id, status: STATUS.error, error: 'image_url must be a public https:// link.' });
      continue;
    }
    if (channels.list.includes('instagram') && !imageUrl) {
      updates.push({ post_id: row.post_id, status: STATUS.needsImage, error: 'Instagram posts need a public JPEG link in image_url. Add one, or remove instagram from channels, then approve again.' });
      continue;
    }
    if (!publish) {
      publish = { post_id: row.post_id, text, image_url: imageUrl, channels: channels.list, wants_facebook: channels.list.includes('facebook'), wants_instagram: channels.list.includes('instagram') };
    }
  }
  return { publish, updates };
}

/** Publisher: the row update after posting, from what each channel returned. */
function publishOutcome(post, results, now, dryRun) {
  const errors = [];
  const out = { post_id: post.post_id, published_at: formatMyt(now) };
  if (post.wants_facebook) {
    if (results.facebook && results.facebook.id) out.fb_post_id = String(results.facebook.id);
    else errors.push(`Facebook: ${describeError(results.facebook)}`);
  }
  if (post.wants_instagram) {
    if (results.instagram && results.instagram.id) out.ig_media_id = String(results.instagram.id);
    else errors.push(`Instagram: ${describeError(results.instagram)}`);
  }
  const anyPosted = Boolean(out.fb_post_id || out.ig_media_id);
  if (!errors.length) {
    out.status = dryRun ? STATUS.postedDryRun : STATUS.posted;
    out.error = '';
  } else {
    // Never set back to "approved": a half-posted row must not be posted again automatically.
    out.status = STATUS.error;
    out.error = (anyPosted ? 'Partly posted – check the Page before retrying. ' : '') + errors.join(' ; ');
    if (!anyPosted) delete out.published_at;
  }
  return out;
}

function describeError(result) {
  if (!result) return 'no response';
  const e = result.error;
  if (!e) return 'response had no id';
  if (typeof e === 'string') return e.slice(0, 300);
  const message = (e.message || e.description || JSON.stringify(e)) + '';
  return message.slice(0, 300);
}

/* @export-start */
module.exports = {
  POST_COLUMNS, STATUS, buildSlots, languagesFrom, buildContentMessages, postsToRows, fakeContent,
  pickNextPost, publishOutcome, cleanHashtags, normaliseStatus,
};
/* @export-end */
