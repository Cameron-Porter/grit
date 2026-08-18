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
