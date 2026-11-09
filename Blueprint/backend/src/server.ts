import express from "express";
import cors from "cors";
import "dotenv/config";
import { callAIModel } from "./service/ai.service.js";

const app = express();
 
// get port info from .env file
const PORT = Number(process.env.PORT) || 3001;
 
// middleware
app.use(cors());
app.use(express.json());
 
// backend test endpoint
app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is working!" });
});

type PlanBlock = { id: string; data: { title: string; description?: string } };
type PlanLink = { source: string; target: string; data?: { label?: string } };

// turns the canvas (blocks + arrows) into a text prompt for the model
function buildPrompt(name: string, nodes: PlanBlock[], edges: PlanLink[]) {
  const titles = new Map(nodes.map((n) => [n.id, n.data.title]));
  const blocks = nodes
    .map((n) => `- ${n.data.title}${n.data.description ? `: ${n.data.description}` : ""}`)
    .join("\n");
  const links = edges
    .map((e) => {
      const label = e.data?.label ? ` (${e.data.label})` : "";
      return `- ${titles.get(e.source)} -> ${titles.get(e.target)}${label}`;
    })
    .join("\n");

  return `Here is a plan for a software project called "${name}".

Blocks:
${blocks || "(none)"}

Connections:
${links || "(none)"}

Generate code that implements this plan.`;
}

// send the plan to the AI model
app.post("/api/generate", async (req, res) => {
  const { name = "Untitled plan", nodes, edges = [] } = req.body ?? {};
  if (!Array.isArray(nodes) || nodes.length === 0) {
    res.status(400).json({ error: "The plan has no blocks yet." });
    return;
  }

  try {
    const result = await callAIModel(buildPrompt(name, nodes, edges));
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "The AI request failed." });
  }
});
 
// start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});