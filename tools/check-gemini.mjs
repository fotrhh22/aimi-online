// One tiny synthetic generation to verify the configured model and structured output.
// No user prompts, secrets, or provider response bodies are printed.
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
config({ path: fileURLToPath(new URL('../apps/api/.env.local', import.meta.url)), quiet: true });
const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_TEXT_MODEL;
if (!key || !model || !/^[a-zA-Z0-9_.-]+$/.test(model)) throw new Error('Gemini key/model configuration missing or invalid');
try {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Connection check. Return the JSON object with ok set to true.' }] }], generationConfig: { maxOutputTokens: 256, responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    console.log(`Gemini check failed: HTTP ${response.status}. Provider details suppressed.`);
    process.exitCode = 1;
  } else {
    const body = await response.json();
    const result = JSON.parse(body.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '{}');
    if (result.ok !== true) throw new Error('Unexpected structured response');
    console.log('Gemini model access and structured JSON output: PASS');
  }
} catch { console.error('Gemini check failed: network, timeout or response validation error.'); process.exitCode = 1; }
