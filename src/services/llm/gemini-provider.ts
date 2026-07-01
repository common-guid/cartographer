import { LLMProvider } from './rename-service.js';

export class GeminiLLMProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model || 'gemini-1.5-flash';
  }

  async rename(name: string, context: string): Promise<string> {
    if (!this.apiKey) {
      console.warn('[GeminiProvider] Missing GEMINI_API_KEY. Falling back to original name.');
      return name;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    // We construct a specific prompt similar to humanify to ensure AST-level safety
    const prompt = `You are a professional deobfuscator. Suggest a semantic, human-readable name for the obfuscated variable/function named "${name}" based on the surrounding source code context below. 
    Return ONLY the suggested name, with no explanations, Markdown formatting, or extra text.

    Context:
    \`\`\`javascript
    ${context}
    \`\`\`
    
    Suggested name:`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 20,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[GeminiProvider] API request failed: ${response.statusText}. Response: ${errorText}`);
        return name;
      }

      const data = await response.json();
      const suggestedName = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (suggestedName) {
        // Strip any markdown code formatting just in case the LLM returned it
        return suggestedName.replace(/[`'"]/g, '');
      }
      
      return name;
    } catch (error) {
      console.warn('[GeminiProvider] Failed to query Gemini API:', error);
      return name;
    }
  }
}
