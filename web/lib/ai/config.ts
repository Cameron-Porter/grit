/**
 * Program generation runs on one shared Gemini key held by the server, so every
 * account can use the feature without supplying their own.
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
