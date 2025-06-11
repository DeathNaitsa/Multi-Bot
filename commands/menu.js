const fs = require('fs');
const path = require('path');
const { findByPlatform } = require('../db/users'); // Angenommen, du hast eine Funktion zum Finden von Usern
module.exports = {
  name: 'menu',
  aliases: ['hilfe', 'commands', 'menü', 'help'],
  description: 'Zeigt alle verfügbaren Befehle und eine kurze Erklärung.',

  async execute({ m, send }) {
    const commandsPath = __dirname;
    let user = await findByPlatform(m.platform, m.sender);
    if (!user) {
      return send({ chat: chatId, text: '❌ Du bist noch nicht registriert. Mit `!reg Name.Alter` registrieren.' });
    }
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') && f !== 'menu.js');

    // Lade alle Commands und filtere nach .name und .description
    const commands = files.map(file => {
      try {
        const cmd = require(path.join(commandsPath, file));
        return cmd && cmd.name && cmd.description
          ? { name: cmd.name, aliases: cmd.aliases, description: cmd.description }
          : null;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Nach Name sortieren
    commands.sort((a, b) => a.name.localeCompare(b.name));

    // Übersichtliches Menü bauen
    let text = `📖 *Bot-Menü*\n────────────────────────────\n`;
    for (const cmd of commands) {
      text += `\n*• !${cmd.name}*`;
      if (cmd.aliases && cmd.aliases.length) text += `  _(${cmd.aliases.join(', ')})_`;
      text += `\n   ${cmd.description}\n────────────────────────────`;
    }

    text += `\n\nℹ️ Schreibe z.B. *!hilfe* oder *!me info* für Details zu einzelnen Befehlen.`;

    return send({
      chat: m.chat,
      text
    });
  }
};