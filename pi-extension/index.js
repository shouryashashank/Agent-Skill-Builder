// skill-name — pi agent harness extension.
//
// Injects this repo's AGENTS.md into every turn and registers /skill-name.
// Install with: pi install git:github.com/your-handle/skill-name

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const agentsMdPath = path.join(root, 'AGENTS.md');

function readInstructions() {
  try {
    return fs.readFileSync(agentsMdPath, 'utf8').trim();
  } catch (e) {
    return '';
  }
}

module.exports = {
  name: 'skill-name',
  onTurnStart(ctx) {
    const instructions = readInstructions();
    if (instructions) ctx.addSystemMessage(instructions);
  },
  commands: {
    'skill-name': {
      description: 'TODO: one-line description of what this command does.',
      run(args, ctx) {
        ctx.reply('TODO: handle /skill-name ' + args);
      },
    },
  },
};
