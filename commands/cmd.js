const fs = require('fs');
const path = require('path');
const { findByPlatform } = require('../db/users');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'cmd',
  aliases: ['command', 'befehl', 'info'],
  get description() {
    // Dynamische Beschreibung je nach Chat-Sprache (m.chat ist immer vorhanden)
    return async function(m) {
      const chatDb = await loadChatById(m.chat);
      const lang = (chatDb && chatDb.sprache) || 'de';
      return t('cmd_description', lang);
    };
  },

  async execute({ args, m, send }) {
    // Sprache aus Chat-DB laden
    const chatDb = await loadChatById(m.chat);
    const lang = (chatDb && chatDb.sprache) || 'de';
    if (!args[0]) {
      return send({
        chat: m.chat,
        text: t('cmd_no_arg', lang)
      });
    }
    let user = await findByPlatform(m.platform, m.sender);
    if (!user || user.teamm !== 'Inhaber') {
      return send({
        chat: m.chat,
        text: t('cmd_owner_only', lang)
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
        text: t('cmd_not_found', lang, { cmd: cmdName })
      });
    }

    let code = fs.readFileSync(filePath, 'utf8');
    // Discord/Telegram: Code-Block, WhatsApp: Markdown
    if (code.length > 60000) code = code.slice(0, 60000) + '\n// ...gekürzt...';
    const msg = t('cmd_code_header', lang, { cmd: cmdName }) + `\n\js\n${code}\n\`;
    return send({
      chat: m.chat,
      text: msg
    });
  }
};