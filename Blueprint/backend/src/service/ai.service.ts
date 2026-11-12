import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ReviewSchema, type Review } from "../plan.js";

const MODEL = "gpt-4o-mini";

// An error whose message is safe to show the user, with the HTTP status to send it with.
export class AIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

// Created on first use, so a missing OPENAI_API_KEY is a readable error instead of a crash at startup.
let client: OpenAI | null = null;
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError("The AI isn't set up yet: OPENAI_API_KEY is missing on the server.", 503);
  }
  client ??= new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  return client;
}

// Turns whatever OpenAI threw into an error we can show.
function toAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  console.error(err);
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return new AIError("The AI took too long to answer. Try again.", 504);
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AIError("Too many requests to the AI right now. Wait a moment and try again.", 429);
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return new AIError("The AI rejected the server's OPENAI_API_KEY. Check that it is correct.", 503);
  }
  return new AIError("The AI request failed.", 502);
}

// Sends a prompt and returns the model's reply as text (used for generating code).
export async function callAIModel(prompt: string): Promise<string> {
  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw toAIError(err);
  }
}

// Asks the model to review a plan and returns its answer in the shape of ReviewSchema.
export async function reviewPlan(system: string, prompt: string): Promise<Review> {
  try {
    const response = await getClient().chat.completions.parse({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(ReviewSchema, "plan_review"),
    });
    const message = response.choices[0]?.message;
    if (!message?.parsed) throw unreadableAnswer(message?.refusal);
    return message.parsed;
  } catch (err) {
    // A reply that was cut off or isn't valid JSON is not an API error; the answer is unusable.
    if (err instanceof AIError || err instanceof OpenAI.APIError) throw toAIError(err);
    throw unreadableAnswer(err);
  }
}

// The model's answer was a refusal, was cut off, or didn't match the schema. We never pass on partial results.
function unreadableAnswer(cause: unknown): AIError {
  if (cause) console.error("Unreadable AI answer:", cause);
  return new AIError("The AI's answer couldn't be read. Try again.", 502);
}
