/**
 * Program generation uses a server-selected provider: local llama.cpp or Gemini.
 * Accounts never need to supply their own provider credentials.
 *
 * The key is read here and used only inside route handlers - it must never be
 * exposed as NEXT_PUBLIC_*, because that inlines it into the client bundle where
 * anyone can read it out of the deployed JavaScript. The generation request
 * itself moved server-side for the same reason.
 */
export const AI_MODEL = 'gemini-3.6-flash';

export const geminiApiKey = (): string => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('Program generation is not configured on this server.');
  return key;
};

/** Server configuration only. Selecting local never falls back to a cloud model. */
export function programAiConfig(env: Record<string, string | undefined> = process.env) {
  const provider = env.GRIT_AI_PROGRAM_PROVIDER?.trim() || 'gemini';
  if (provider === 'local') {
    const base = new URL(env.GRIT_AI_BASE_URL || 'http://127.0.0.1:8080/v1');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      throw new Error('Invalid local AI configuration.');
    }
    return { provider: 'local' as const, baseUrl: base.href.replace(/\/$/, ''), model: env.GRIT_AI_MODEL?.trim() || 'qwen', apiKey: env.GRIT_AI_API_KEY?.trim() || '' };
  }
  if (provider !== 'gemini') throw new Error('Unknown program AI provider. Choose local or gemini.');
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Program generation is not configured on this server.');
  return { provider: 'gemini' as const, model: AI_MODEL, apiKey };
}
