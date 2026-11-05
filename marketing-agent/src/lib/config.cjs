/**
 * Settings live in the "config" tab of the Google Sheet (columns: key, value, notes)
 * so they are edited in one place for all workflows. Only the sheet ID is set inside n8n.
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

const CONFIG_DEFAULTS = {
  DRY_RUN: true,
  USE_FAKE_LLM: true,
  LLM_BASE_URL: 'https://api.openai.com/v1',
  LLM_MODEL: 'PLACEHOLDER_MODEL_NAME',
  LLM_JSON_MODE: true,
  LLM_TEMPERATURE: 0.7,
  BRAND_RULES_URL: 'PLACEHOLDER_BRAND_RULES_URL',
  CONTENT_BRIEF_URL: 'PLACEHOLDER_CONTENT_BRIEF_URL',
  WHATSAPP_NUMBER: '60XXXXXXXXX',
  FB_PAGE_ID: 'PLACEHOLDER_FB_PAGE_ID',
  IG_USER_ID: 'PLACEHOLDER_IG_USER_ID',
  WA_PHONE_NUMBER_ID: 'PLACEHOLDER_WA_PHONE_NUMBER_ID',
  GRAPH_API_VERSION: 'v25.0',
  POST_DAYS: 'Mon,Wed,Fri',
  POST_TIME: '21:00',
  LANGUAGES: 'en,zh',
  DEFAULT_CHANNELS: 'facebook,instagram',
  WEEK_OFFSET: 1,
  PRIVACY_NOTICE_URL: '',
  REPLY_WINDOW_HOURS: 23,
  MAX_REPLIES_PER_RUN: 5,
  REPORT_CHANNEL: 'email',
  REPORT_EMAIL_TO: 'you@example.com',
  REPORT_EMAIL_FROM: 'n8n@example.com',
  TELEGRAM_CHAT_ID: 'PLACEHOLDER_TELEGRAM_CHAT_ID',
};

const BOOLEAN_KEYS = ['DRY_RUN', 'USE_FAKE_LLM', 'LLM_JSON_MODE'];
const NUMBER_KEYS = ['LLM_TEMPERATURE', 'WEEK_OFFSET', 'REPLY_WINDOW_HOURS', 'MAX_REPLIES_PER_RUN'];

function parseBoolean(value, key) {
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'on'].includes(text)) return true;
  if (['false', 'no', 'n', '0', 'off'].includes(text)) return false;
  throw new Error(`Config ${key} must be TRUE or FALSE, got "${value}".`);
}

function isPlaceholder(value) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text === '' || /PLACEHOLDER/i.test(text) || /X{6,}/.test(text) || /@example\.com$/i.test(text);
}

/** rows: items from the config tab ({key, value}). Unknown keys are kept as strings. */
function parseConfig(rows) {
  const config = Object.assign({}, CONFIG_DEFAULTS);
  for (const row of rows || []) {
    const key = String((row && row.key) || '').trim().toUpperCase();
    if (!key || key.startsWith('#')) continue;
    const raw = row.value === undefined || row.value === null ? '' : row.value;
    if (String(raw).trim() === '') continue; // empty cell = keep the default
    config[key] = typeof raw === 'string' ? raw.trim() : raw;
  }
  for (const key of BOOLEAN_KEYS) config[key] = parseBoolean(config[key], key);
  for (const key of NUMBER_KEYS) {
    const n = Number(config[key]);
    if (!Number.isFinite(n)) throw new Error(`Config ${key} must be a number, got "${config[key]}".`);
    config[key] = n;
  }
  config.WHATSAPP_NUMBER = String(config.WHATSAPP_NUMBER).replace(/[^\dX]/gi, '');
  config.LLM_BASE_URL = String(config.LLM_BASE_URL).replace(/\/+$/, '');
  return config;
}

/** Throw one clear error listing every key that still holds a placeholder. */
function requireConfigured(config, keys, reason) {
  const missing = keys.filter((key) => isPlaceholder(config[key]));
  if (missing.length) {
    throw new Error(`Fill in ${missing.join(', ')} in the "config" tab of the Google Sheet (${reason}).`);
  }
}

function listSetting(value) {
  return String(value || '')
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/* @export-start */
module.exports = { CONFIG_DEFAULTS, parseConfig, requireConfigured, isPlaceholder, listSetting };
/* @export-end */
