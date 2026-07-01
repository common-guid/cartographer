import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiLLMProvider } from '../src/services/llm/gemini-provider.js';

describe('GeminiLLMProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct correct API request and extract suggested name', async () => {
    const mockResponseData = {
      candidates: [
        {
          content: {
            parts: [{ text: '  renamedFunction  ' }],
          },
        },
      ],
    };

    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    } as Response);

    const provider = new GeminiLLMProvider('test-api-key', 'gemini-2.5-flash');
    const result = await provider.rename('_0xabc', 'function _0xabc() { return 42; }');

    expect(result).toBe('renamedFunction');
    
    // Verify fetch arguments
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    
    expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-api-key');
    expect(options?.method).toBe('POST');
    
    const body = JSON.parse(options?.body as string);
    expect(body.contents[0].parts[0].text).toContain('_0xabc');
    expect(body.contents[0].parts[0].text).toContain('function _0xabc() { return 42; }');
  });

  it('should clean quotes from LLM response', async () => {
    const mockResponseData = {
      candidates: [
        {
          content: {
            parts: [{ text: '"cleanName"' }],
          },
        },
      ],
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    } as Response);

    const provider = new GeminiLLMProvider('test-api-key', 'gemini-1.5-flash');
    const result = await provider.rename('_0xabc', 'const _0xabc = 42;');

    expect(result).toBe('cleanName');
  });

  it('should fallback to original name if API fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      text: async () => 'Internal Server Error',
    } as Response);

    const provider = new GeminiLLMProvider('test-api-key', 'gemini-1.5-flash');
    const result = await provider.rename('_0xabc', 'const _0xabc = 42;');

    expect(result).toBe('_0xabc');
  });
});
