/**
 * OpenRouter API Client
 *
 * Handles all AI model interactions via OpenRouter unified API
 * - Supports multiple models (GPT-4o, Claude 3.5 Sonnet, GPT-OSS-120b)
 * - Retry logic with exponential backoff
 * - Token tracking for cost analysis
 * - Error handling with detailed logging
 */

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterRequestOptions {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface OpenRouterClientConfig {
  apiKey: string;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * OpenRouter API client with retry logic
 */
export class OpenRouterClient {
  private apiKey: string;
  private maxRetries: number;
  private retryDelay: number;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(config: OpenRouterClientConfig) {
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  /**
   * Make a chat completion request with retry logic
   */
  async chatCompletion(
    options: OpenRouterRequestOptions
  ): Promise<OpenRouterResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://kimia.uautonoma.cl", // Optional: for OpenRouter analytics
            "X-Title": "Kimia Innovation Platform", // Optional: for OpenRouter dashboard
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4000,
            top_p: options.topP ?? 1,
            stream: options.stream ?? false,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `OpenRouter API error: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        const data = await response.json();
        return data as OpenRouterResponse;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (400-499)
        if (error instanceof Error && error.message.includes("400")) {
          throw error;
        }

        // If this wasn't the last attempt, wait before retrying
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          console.log(`Retrying OpenRouter request (attempt ${attempt + 1}/${this.maxRetries})...`);
        }
      }
    }

    throw new Error(
      `OpenRouter request failed after ${this.maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * Helper to extract content from response
   */
  extractContent(response: OpenRouterResponse): string {
    return response.choices[0]?.message?.content ?? "";
  }

  /**
   * Helper to get token usage from response
   */
  getTokenUsage(response: OpenRouterResponse): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    return {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };
  }
}

/**
 * Model configurations for different AI tasks
 */
export const AI_MODELS = {
  // Complex reasoning and content generation
  COMPLEX: "openai/gpt-4o",

  // Document analysis and evaluation support
  ANALYSIS: "anthropic/claude-3.5-sonnet",

  // High-reasoning analytical tasks (proposal fit analysis)
  REASONING: "openai/gpt-oss-120b",

  // Cost-effective routine tasks
  ROUTINE: "mistralai/mixtral-8x7b-instruct",
} as const;

/**
 * Calculate estimated cost for a request
 * Prices per 1M tokens (as of Nov 2025)
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "openai/gpt-4o": { input: 2.5, output: 10.0 },
    "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
    "openai/gpt-oss-120b": { input: 0.04, output: 0.40 },
    "mistralai/mixtral-8x7b-instruct": { input: 0.24, output: 0.24 },
  };

  const price = pricing[model] ?? { input: 0, output: 0 };
  const inputCost = (promptTokens / 1_000_000) * price.input;
  const outputCost = (completionTokens / 1_000_000) * price.output;

  return inputCost + outputCost;
}
