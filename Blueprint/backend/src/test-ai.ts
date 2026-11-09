import "dotenv/config";
import { callAIModel } from "./service/ai.service.js";
 
async function main() {
  const prompt = "What is React? Explain in one sentence.";
 
  console.log("Sending request to OpenAI...");
 
  const result = await callAIModel(prompt);
 
  console.log("OpenAI Response:");
  console.log(result);
}
 
main().catch(console.error);