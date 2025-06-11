const fs = require('fs');
const path = require('path');
const { findByPlatform } = require('../db/users');

module.exports = {
  name: 'cmd',
  aliases: ['command', 'befehl', 'info'],
  description: 'Sendet den Quellcode eines bestimmten Befehls (nur Owner)',

  async execute({ args, m, send }) {
    if (!args[0]) {
      return send({
        chat: m.chat,
        text: '❓ Bitte gib einen Befehl an, z.B. *!cmd me*'
      });
    }
    let user = await findByPlatform(m.platform, m.sender);
    if (!user || user.teamm !== 'Inhaber') {
      return send({
        chat: m.chat,
        text: '❌ Nur der Owner (Inhaber) darf den Command-Code sehen.'
      });
    }

    const cmdName = args[0].toLowerCase();
    const commandsPath = __dirname;
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    let filePath = null;
    for (const file of files) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (!cmd || !cmd.name) continue;
        if (
          cmd.name.toLowerCase() === cmdName ||
          (cmd.aliases && cmd.aliases.map(a => a.toLowerCase()).includes(cmdName))
        ) {
          filePath = path.join(commandsPath, file);
          break;
        }
      } catch {}
    }

    if (!filePath) {
      return send({
        chat: m.chat,
        text: `❌ Kein Befehl namens *${cmdName}* gefunden.`
      });
    }

    let code = fs.readFileSync(filePath, 'utf8');
    // Discord/Telegram: Code-Block, WhatsApp: Markdown
    if (code.length > 60000) code = code.slice(0, 60000) + '\n// ...gekürzt...';
    const msg = `📄 *Quellcode von !${cmdName}:*\n\`\`\`js\n${code}\n\`\`\``;

    return send({
      chat: m.chat,
      text: msg
    });
  }
};