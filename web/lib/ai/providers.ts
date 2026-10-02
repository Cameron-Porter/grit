export type AiProvider = 'openai' | 'gemini' | 'local';

type StructuredRequest = { provider: AiProvider; apiKey: string; model: string; prompt: string; schema: Record<string, unknown>; baseUrl?: string };

function openAiText(result: any): string | undefined {
  if (typeof result?.output_text === 'string') return result.output_text;
  for (const item of result?.output ?? []) for (const content of item?.content ?? []) if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
}

async function responseBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: { message: text.slice(0, 240) } }; }
}

function geminiGenerateContentText(result: any): string | undefined {
  if(typeof result?.text==='string')return result.text;
  for (const candidate of result?.candidates ?? []) for (const part of candidate?.content?.parts ?? []) if (typeof part?.text === 'string') return part.text;
}

function geminiInteractionText(result:any):string|undefined{
  if(typeof result?.output_text==='string')return result.output_text;
  for(const output of [...(result?.outputs??[]),...(result?.steps??[]).filter((step:any)=>step?.type==='model_output')]){
    if(typeof output?.text==='string')return output.text;
    for(const content of output?.content??[])if((content?.type==='text'||content?.type==='output_text')&&typeof content?.text==='string')return content.text;
  }
}

async function requestGeminiFallback(apiKey: string, model: string, prompt: string, schema: Record<string, unknown>): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema } }),
  });
  const result = await responseBody(response);
  if (!response.ok) throw new Error(result?.error?.message ?? 'Gemini could not generate the program.');
  const output = geminiGenerateContentText(result);
  if (!output?.trim()) throw new Error('Gemini returned no program.');
  return output;
}

export async function requestStructuredProgram({ provider, apiKey, model, prompt, schema, baseUrl }: StructuredRequest): Promise<string> {
  if (provider === 'local') {
    if (!baseUrl) throw new Error('Local AI endpoint is not configured.');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(120_000),
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, temperature: 0, stream: false, max_tokens: 4096,
        chat_template_kwargs: { enable_thinking: false },
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: { name: 'grit_program', strict: true, schema } },
      }),
    });
    const result = await responseBody(response);
    if (!response.ok) throw new Error('Local AI could not generate the program. Check llama.cpp availability and context capacity.');
    const choice = result?.choices?.[0];
    if (choice?.finish_reason === 'length') throw new Error('Local AI ran out of context or output space. Increase the llama.cpp context size and retry.');
    const output = choice?.message?.content;
    if (typeof output !== 'string' || !output.trim()) throw new Error('Local AI returned no program.');
    try { JSON.parse(output); } catch { throw new Error('Local AI returned invalid program JSON.'); }
    return output;
  }
  const openai = provider === 'openai';
  const response = await fetch(openai ? 'https://api.openai.com/v1/responses' : 'https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: openai ? { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' } : { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(openai
      ? { model, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }], text: { format: { type: 'json_schema', name: 'grit_program', strict: true, schema } } }
      : { model, input: prompt, response_format: { type: 'text', mime_type: 'application/json', schema } }),
  });
  const result = await responseBody(response);
  if (!response.ok && !openai && response.status >= 500) return requestGeminiFallback(apiKey, model, prompt, schema);
  if (!response.ok) throw new Error(result?.error?.message ?? `${openai ? 'OpenAI' : 'Gemini'} could not generate the program.`);
  const output = openai ? openAiText(result) : geminiInteractionText(result);
  if(!openai&&(!output||!output.trim()))return requestGeminiFallback(apiKey,model,prompt,schema);
  if (typeof output !== 'string' || !output.trim()) throw new Error(`${openai ? 'OpenAI' : 'Gemini'} returned no program.`);
  return output;
}
