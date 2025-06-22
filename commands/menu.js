const fs = require('fs');
const path = require('path');
const { findByPlatform } = require('../db/users'); // Angenommen, du hast eine Funktion zum Finden von Usern
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'menu',
  aliases: ['hilfe', 'commands', 'menü', 'help'],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('menu_description', 'de') || 'Zeigt alle verfügbaren Befehle und eine kurze Erklärung.';
  },
  async execute({ m, send }) {
    // Sprache aus Chat-DB laden
    let lang = 'de';
    try {
      const chatDb = await loadChatById(m.chat);
      if (chatDb && chatDb.language) lang = chatDb.language;
    } catch {}
    const commandsPath = __dirname;
    const user = await findByPlatform(m.platform, m.sender);
    if (!user) {
      return send({ chat: m.chat, text: t('not_registered', lang) });
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
    let text = `📖 *${t('menu_title', lang)}*\n────────────────────────────\n`;
    for (const cmd of commands) {
      let desc = typeof cmd.description === 'function' ? await cmd.description(m) : cmd.description;
      text += `\n*• !${cmd.name}*`;
      if (cmd.aliases && cmd.aliases.length) text += `  _(${cmd.aliases.join(', ')})_`;
      text += `\n   ${desc}\n────────────────────────────`;
    }
    text += `\n\n${t('menu_hint', lang)}`;
    return send({
      chat: m.chat,
      text
    });
  }
};