// /home/ubuntu/emperor_OS/.openclaw/workspace/agent/templates.js
import { promises as fs } from "fs";
import path from "path";
import { CONFIG } from "./config.js";

const PROMPTS_DIR = path.join(CONFIG.WORKSPACE_ROOT, "prompts");

async function readPromptFile(filename) {
  const filePath = path.join(PROMPTS_DIR, filename);
  return fs.readFile(filePath, "utf8");
}

export async function loadTemplateSet(category) {
  const base = await readPromptFile("base.txt");

  let categoryFile = null;
  if (category === "creative") categoryFile = "creative.txt";
  else if (category === "development") categoryFile = "development.txt";
  else if (category === "analysis" || category === "research") categoryFile = "analysis.txt";

  const categoryText = categoryFile ? await readPromptFile(categoryFile) : "";

  return {
    base,
    category: categoryText
  };
}

export async function buildPrompt(brief) {
  const templates = await loadTemplateSet(brief.category);

  return [
    templates.base.trim(),
    templates.category.trim(),
    "Structured job brief JSON:",
    JSON.stringify(brief, null, 2)
  ]
    .filter(Boolean)
    .join("\n\n");
}