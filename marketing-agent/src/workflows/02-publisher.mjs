// Workflow 2 – Publisher.
// Every hour (07:00–23:00 Malaysia time) it looks for ONE row in the "posts" tab whose status
// is "approved" and whose scheduled_for time has come, re-checks the brand rules on the exact
// text, marks it "publishing", posts it to the Facebook Page and/or Instagram via the Meta
// Graph API and logs the returned IDs. Approved rows that cannot be posted as they are get
// "blocked", "needs image" or "error" with the reason. Nothing is posted without "approved".
import {
  workflow, settingsNode, readSheetNode, writeSheetNode, setStatusNode, loadConfigNode, codeNode, ifNode, graphPostNode, sticky, scheduleCron, CFG, V,
} from '../n8n.mjs';

const POST = "$('Post to publish').first().json";

export default function build() {
  const w = workflow('02-publisher', 'RPC 2 – Publisher (approved posts → Facebook & Instagram)');

  sticky(w, 'About this workflow', [-120, -440], [
    '## 2. Publisher',
    'Runs **every hour, 07:00–23:00** (Malaysia time). Posts **one** row per run from the **posts** tab when:',
    '- `status` is **approved** (you typed it), and',
    '- `scheduled_for` is now or in the past (empty = now).',
    '',
    'Before posting it re-checks the brand rules on the text **as it is in the sheet**. Rows that break a rule become **blocked**. Instagram needs a public JPEG link in `image_url` (else **needs image**).',
    '',
    'With `DRY_RUN` = TRUE nothing is sent to Meta; rows become **posted (dry run)**.',
    'A row is set to **publishing** before posting, so it is never posted twice. If something fails it becomes **error** with the reason; it is never retried automatically.',
  ].join('\n'), { width: 560, height: 330, color: 4 });
  sticky(w, 'Meta API note', [2540, -440], [
    '### Meta Graph API',
    'Credential: **Facebook Graph API** with a long-lived **Page access token** that has `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.',
    '',
    '- Facebook text post: `POST /{FB_PAGE_ID}/feed`',
    '- Facebook photo post: `POST /{FB_PAGE_ID}/photos`',
    '- Instagram: `POST /{IG_USER_ID}/media` → wait → `POST /{IG_USER_ID}/media_publish`',
  ].join('\n'), { width: 460, height: 260, color: 6 });

  scheduleCron(w, 'Every hour 07:00–23:00', [0, 0], '0 7-23 * * *');
  settingsNode(w, [220, 0]);
  readSheetNode(w, 'Read config', 'config', [440, 0]);
  loadConfigNode(w, [660, 0]);
  readSheetNode(w, 'Read posts', 'posts', [880, 0]);

  codeNode(w, 'Pick next post', [1100, 0], ['posts'], `
// One approved, due post (or none) + status updates for approved rows that cannot be posted.
const config = $('Load config').first().json;
const rows = $input.all().map((item) => item.json);
const { publish, updates } = pickNextPost(rows, new Date(), config);
if (publish && !config.DRY_RUN) {
  const needed = ['GRAPH_API_VERSION'];
  if (publish.wants_facebook) needed.push('FB_PAGE_ID');
  if (publish.wants_instagram) needed.push('IG_USER_ID');
  requireConfigured(config, needed, 'needed to publish');
}
const items = updates.map((u) => ({ json: Object.assign({ _action: 'update' }, u) }));
if (publish) items.push({ json: Object.assign({ _action: 'publish' }, publish) });
return items;
`);
  ifNode(w, 'Publish this one?', [1320, 0], "$json._action === 'publish'");
  setStatusNode(w, 'Mark publishing', 'posts', 'post_id', 'publishing', [1540, -120]);
  codeNode(w, 'Post to publish', [1760, -120], [], `
// The post picked above (the sheet update node returns its own output, so read it back here).
const post = $('Pick next post').all().map((item) => item.json).find((j) => j._action === 'publish');
return [{ json: post }];
`);
  ifNode(w, 'Dry run?', [1980, -120], CFG('DRY_RUN'));
  codeNode(w, 'Simulate publish', [2200, -320], [], `
// DRY_RUN: pretend each channel worked. Nothing is sent to Meta.
const post = $json;
const results = {};
if (post.wants_facebook) results.facebook = { id: 'dry-run-fb-' + post.post_id };
if (post.wants_instagram) results.instagram = { id: 'dry-run-ig-' + post.post_id };
return [{ json: results }];
`);

  ifNode(w, 'Facebook?', [2200, 0], `${POST}.wants_facebook`);
  ifNode(w, 'Has image?', [2420, -100], `Boolean(${POST}.image_url)`);
  graphPostNode(w, 'Post Facebook photo', [2640, -200], `{{ ${CFG('FB_PAGE_ID')} }}/photos`, `{ url: ${POST}.image_url, message: ${POST}.text }`);
  graphPostNode(w, 'Post Facebook text', [2640, 0], `{{ ${CFG('FB_PAGE_ID')} }}/feed`, `{ message: ${POST}.text }`);
  codeNode(w, 'Facebook result', [2860, -100], [], `
// /photos returns { id, post_id }; /feed returns { id }. Errors arrive as { error } (node continues on fail).
const response = $input.first().json || {};
const id = response.post_id || response.id;
return [{ json: { facebook: id ? { id: String(id) } : { error: response.error || response } } }];
`);

  ifNode(w, 'Instagram?', [3080, 100], `${POST}.wants_instagram`);
  graphPostNode(w, 'Create IG container', [3300, 0], `{{ ${CFG('IG_USER_ID')} }}/media`, `{ image_url: ${POST}.image_url, caption: ${POST}.text }`);
  w.add('Wait for Instagram', 'n8n-nodes-base.wait', V.wait, [3520, 0], { amount: 20, unit: 'seconds' }, { webhookId: '6f1c2b8e-5d3a-4e7b-9a10-2c4d6e8f0a12' });
  graphPostNode(w, 'Publish IG container', [3740, 0], `{{ ${CFG('IG_USER_ID')} }}/media_publish`, `{ creation_id: $('Create IG container').first().json.id }`);
  codeNode(w, 'Instagram result', [3960, 0], [], `
const container = $('Create IG container').first().json || {};
const response = $input.first().json || {};
const instagram = response.id
  ? { id: String(response.id) }
  : { error: response.error || container.error || 'Instagram did not return a media id' };
return [{ json: { instagram } }];
`);

  codeNode(w, 'Finalise', [4180, 200], ['posts'], `
// Combine what each channel returned into one row update (posted / posted (dry run) / error).
const config = $('Load config').first().json;
const post = $('Post to publish').first().json;
const results = {};
if ($('Simulate publish').isExecuted) {
  Object.assign(results, $('Simulate publish').first().json);
} else {
  if ($('Facebook result').isExecuted) results.facebook = $('Facebook result').first().json.facebook;
  if ($('Instagram result').isExecuted) results.instagram = $('Instagram result').first().json.instagram;
}
return [{ json: publishOutcome(post, results, new Date(), config.DRY_RUN) }];
`);
  writeSheetNode(w, 'Update post row', 'posts', 'update', 'post_id', [4400, 200]);

  w.chain('Every hour 07:00–23:00', 'Settings', 'Read config', 'Load config', 'Read posts', 'Pick next post', 'Publish this one?');
  w.link('Publish this one?', 'Mark publishing', 0);
  w.link('Publish this one?', 'Update post row', 1);
  w.chain('Mark publishing', 'Post to publish', 'Dry run?');
  w.link('Dry run?', 'Simulate publish', 0);
  w.link('Dry run?', 'Facebook?', 1);
  w.link('Simulate publish', 'Finalise');
  w.link('Facebook?', 'Has image?', 0);
  w.link('Facebook?', 'Instagram?', 1);
  w.link('Has image?', 'Post Facebook photo', 0);
  w.link('Has image?', 'Post Facebook text', 1);
  w.link('Post Facebook photo', 'Facebook result');
  w.link('Post Facebook text', 'Facebook result');
  w.link('Facebook result', 'Instagram?');
  w.link('Instagram?', 'Create IG container', 0);
  w.link('Instagram?', 'Finalise', 1);
  w.chain('Create IG container', 'Wait for Instagram', 'Publish IG container', 'Instagram result', 'Finalise');
  w.link('Finalise', 'Update post row');
  return w;
}
