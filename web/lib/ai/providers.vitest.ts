import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestStructuredProgram } from './providers';

const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };

describe('AI provider requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to Gemini generateContent when Interactions has an internal error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Internal error' } }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestStructuredProgram({ provider: 'gemini', apiKey: 'local-key', model: 'gemini-3.6-flash', prompt: 'test', schema })).resolves.toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/models/gemini-3.6-flash:generateContent');
    const fallbackBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(fallbackBody.generationConfig).toEqual({ responseMimeType: 'application/json', responseJsonSchema: schema });
  });

  it('reads text from the REST Interactions steps envelope',async()=>{const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{"ok":true}'}]}]}),{status:200}));vi.stubGlobal('fetch',fetchMock);await expect(requestStructuredProgram({provider:'gemini',apiKey:'local-key',model:'gemini-3.6-flash',prompt:'test',schema})).resolves.toBe('{"ok":true}');expect(fetchMock).toHaveBeenCalledTimes(1)});

  it('falls back when a successful Interactions response contains no model text',async()=>{const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({status:'incomplete',steps:[]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]}),{status:200}));vi.stubGlobal('fetch',fetchMock);await expect(requestStructuredProgram({provider:'gemini',apiKey:'local-key',model:'gemini-3.6-flash',prompt:'test',schema})).resolves.toBe('{"ok":true}');expect(fetchMock).toHaveBeenCalledTimes(2)});

  it('does not retry an invalid Gemini key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestStructuredProgram({ provider: 'gemini', apiKey: 'bad', model: 'gemini-3.6-flash', prompt: 'test', schema })).rejects.toThrow('Invalid API key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});


describe('local program generation', () => {
  afterEach(() => vi.unstubAllGlobals());
  const request = { provider: 'local' as const, apiKey: 'secret', model: 'qwen', baseUrl: 'http://127.0.0.1:8080/v1', prompt: 'Choose exercises', schema };
  it('sends the schema to llama.cpp with server credentials and thinking disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestStructuredProgram(request)).resolves.toBe('{"ok":true}');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8080/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer secret');
    expect(options.redirect).toBe('error');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toMatchObject({ model: 'qwen', chat_template_kwargs: { enable_thinking: false }, response_format: { json_schema: { strict: true, schema } } });
  });
  it.each([
    [{ error: 'offline' }, 503, 'could not generate'],
    [{ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }, 200, 'ran out'],
    [{ choices: [] }, 200, 'no program'],
    [{ choices: [{ message: { content: 'not json' } }] }, 200, 'invalid program JSON'],
  ])('shows failures without sending data to a cloud fallback', async (body, status, message) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestStructuredProgram(request)).rejects.toThrow(message);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
