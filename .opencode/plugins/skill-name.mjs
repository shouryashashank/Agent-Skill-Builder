import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(thisFile), "..", "..");
const agentsPath = path.join(root, "AGENTS.md");

function readAgents() {
  try {
    return fs.readFileSync(agentsPath, "utf8").trim();
  } catch {
    return "";
  }
}

export default {
  name: "skill-name",
  skills: ["skills"],
  experimental: {
    chat: {
      system: {
        transform(input) {
          const rules = readAgents();
          if (!rules) return input;
          if (!input) return rules;
          return `${rules}\n\n${input}`;
        },
      },
    },
  },
};
