import express from "express";
import type { ErrorRequestHandler, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { AIError, callAIModel, reviewPlan } from "./service/ai.service.js";
import {
  PlanRequestSchema,
  REVIEW_SYSTEM_PROMPT,
  buildGeneratePrompt,
  buildReviewPrompt,
  describeRequestError,
  normalizePlan,
  sanitizeReview,
  type Plan,
} from "./plan.js";

const app = express();

// get port info from .env file
const PORT = Number(process.env.PORT) || 3001;

// middleware
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// backend test endpoint
app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// checks the request body and cleans it up; sends the 400 itself and returns null if it is not valid
function readPlan(body: unknown, res: Response): Plan | null {
  const parsed = PlanRequestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: describeRequestError(parsed.error) });
    return null;
  }
  return normalizePlan(parsed.data);
}

// send the plan to the AI model and get code back
app.post("/api/generate", async (req, res) => {
  const plan = readPlan(req.body, res);
  if (!plan) return;

  const result = await callAIModel(buildGeneratePrompt(plan));
  res.json({ result });
});

// ask the AI model to review the plan: issues and suggested boxes
app.post("/api/check", async (req, res) => {
  const plan = readPlan(req.body, res);
  if (!plan) return;

  const review = await reviewPlan(REVIEW_SYSTEM_PROMPT, buildReviewPrompt(plan));
  res.json(sanitizeReview(review, plan));
});

// turns errors into readable { error } responses (express 5 passes async errors here too)
const handleError: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof AIError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const type = typeof err === "object" && err !== null && "type" in err ? err.type : undefined;
  if (type === "entity.too.large") {
    res.status(413).json({ error: "The plan is too large to send (limit 200 KB)." });
    return;
  }
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "The request wasn't valid JSON." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
};
app.use(handleError);

// start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
