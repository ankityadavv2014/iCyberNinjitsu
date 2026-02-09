export interface LLMOptions {
  provider?: 'openai' | 'anthropic' | 'ollama' | 'local';
  model?: string;
  maxTokens?: number;
}

export interface LLMClient {
  complete(prompt: string, system?: string, options?: LLMOptions): Promise<string>;
}

/* ------------------------------------------------------------------ */
/*  Mock (placeholder text, no network)                                */
/* ------------------------------------------------------------------ */
export function createMockLLMClient(): LLMClient {
  return {
    async complete(prompt: string, _system?: string): Promise<string> {
      return `[Generated placeholder for: ${prompt.slice(0, 50)}...]`;
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Ollama  – local, free, no key                                      */
/*  Install: https://ollama.com  then `ollama pull llama3.2`           */
/*  Uses the OpenAI-compatible endpoint at /v1/chat/completions        */
/* ------------------------------------------------------------------ */
export function createOllamaClient(baseUrl?: string, model?: string): LLMClient {
  const url = (baseUrl ?? process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  const defaultModel = model ?? process.env.OLLAMA_MODEL ?? 'llama3.2';
  return {
    async complete(prompt: string, system?: string, options?: LLMOptions): Promise<string> {
      const m = options?.model ?? defaultModel;
      const messages: { role: string; content: string }[] = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: m,
          messages,
          max_tokens: options?.maxTokens ?? 1024,
          stream: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Anthropic (requires ANTHROPIC_API_KEY)                             */
/* ------------------------------------------------------------------ */
export function createAnthropicClient(apiKey: string): LLMClient {
  // Dynamic import so the SDK isn't required unless actually used
  return {
    async complete(prompt: string, system?: string, options?: LLMOptions): Promise<string> {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const model = options?.model ?? 'claude-sonnet-4-20250514';
      const maxTokens = options?.maxTokens ?? 1024;
      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      });
      const block = msg.content[0];
      return block.type === 'text' ? block.text : '';
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Factory – picks the best available provider automatically          */
/*                                                                     */
/*  Priority:                                                          */
/*    1. ANTHROPIC_API_KEY set      → Anthropic Claude                 */
/*    2. Ollama reachable (local)   → Ollama (llama3.2 by default)     */
/*    3. Neither                    → Mock (placeholder text)          */
/*                                                                     */
/*  Override with LLM_PROVIDER env: "ollama", "anthropic", or "mock"   */
/* ------------------------------------------------------------------ */
export function createLLMClient(): LLMClient {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();

  if (forced === 'ollama' || forced === 'local') {
    console.log('[generate] Using Ollama (local) LLM');
    return createOllamaClient();
  }
  if (forced === 'mock') {
    console.log('[generate] Using mock LLM');
    return createMockLLMClient();
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    console.log('[generate] Using Anthropic Claude');
    return createAnthropicClient(anthropicKey);
  }

  // Try Ollama by default (free, local, no key)
  console.log('[generate] No API key set – trying Ollama at localhost:11434 (install: https://ollama.com)');
  return createOllamaWithFallback();
}

/**
 * Returns an Ollama client that falls back to mock if the first call fails
 * (e.g. Ollama isn't running).
 */
function createOllamaWithFallback(): LLMClient {
  const ollama = createOllamaClient();
  const mock = createMockLLMClient();
  let useMock = false;

  return {
    async complete(prompt: string, system?: string, options?: LLMOptions): Promise<string> {
      if (useMock) return mock.complete(prompt, system, options);
      try {
        return await ollama.complete(prompt, system, options);
      } catch (e) {
        console.warn('[generate] Ollama not reachable, falling back to mock. Install Ollama for real content: https://ollama.com');
        useMock = true;
        return mock.complete(prompt, system, options);
      }
    },
  };
}
