/**
 * OpenAI-compatible chat-completions helpers (OpenAI, OpenRouter, DeepSeek, Groq, a local
 * Ollama/LM Studio server, ...). The request is sent by an HTTP Request node.
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

function buildChatRequest(options) {
  const body = {
    model: options.model,
    temperature: options.temperature,
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ],
  };
  if (options.jsonMode) body.response_format = { type: 'json_object' };
  return body;
}

/** The assistant text from a chat-completions response, or a clear error. */
function extractContent(response) {
  if (!response || typeof response !== 'object') throw new Error('LLM returned an empty response.');
  if (response.error) {
    const message = typeof response.error === 'string' ? response.error : response.error.message || JSON.stringify(response.error);
    throw new Error(`LLM request failed: ${String(message).slice(0, 300)}`);
  }
  const choice = Array.isArray(response.choices) ? response.choices[0] : null;
  const content = choice && choice.message ? choice.message.content : null;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM response had no choices[0].message.content. Is LLM_BASE_URL an OpenAI-compatible /v1 endpoint?');
  }
  return content;
}

/** Parse JSON even when the model wraps it in ``` fences or adds a sentence around it. */
function parseJsonLoose(text) {
  const value = String(text || '').trim();
  const unfenced = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch (_) {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1));
      } catch (_) {
        /* fall through */
      }
    }
  }
  throw new Error(`LLM did not return valid JSON. First 200 characters: ${value.slice(0, 200)}`);
}

/** Wrap text as a chat-completions response (used by the fake LLM for testing). */
function fakeChatResponse(object) {
  return { id: 'fake-llm', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(object) } }] };
}

/* @export-start */
module.exports = { buildChatRequest, extractContent, parseJsonLoose, fakeChatResponse };
/* @export-end */
