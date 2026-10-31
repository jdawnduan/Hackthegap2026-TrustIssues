// Thin wrapper around the Anthropic SDK for JSON-shaped answers.
// Uses structured outputs so replies always parse, and server-side refusal
// fallbacks so a policy decline is retried on Anthropic's default fallback model.

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;

export function claudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export class ClaudeUnavailable extends Error {}

export async function askClaudeJSON<T>(opts: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  if (!claudeEnabled()) throw new ClaudeUnavailable("No Claude credentials configured");
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: opts.messages,
      output_config: { effort: opts.effort, format: { type: "json_schema", schema: opts.schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
      throw new ClaudeUnavailable(`Claude declined (${response.stop_details?.category ?? "unspecified"})`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new ClaudeUnavailable("Claude reply was cut off (max_tokens)");
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new ClaudeUnavailable("Claude returned no text");
    return JSON.parse(textBlock.text) as T;
  } catch (error) {
    if (error instanceof ClaudeUnavailable) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new ClaudeUnavailable("Invalid Claude API key");
    if (error instanceof Anthropic.RateLimitError) throw new ClaudeUnavailable("Claude rate limited");
    if (error instanceof Anthropic.APIError) throw new ClaudeUnavailable(`Claude API error ${error.status}`);
    if (error instanceof SyntaxError) throw new ClaudeUnavailable("Claude returned invalid JSON");
    throw new ClaudeUnavailable(`Claude call failed: ${(error as Error).message}`);
  }
}
