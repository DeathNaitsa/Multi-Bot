// commands/ban.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');
module.exports = {
  name: 'ban',
  // description wird nur über den Getter bereitgestellt
  async execute({ m, args, send, platformApi }) {
    // Sprache aus Chat-DB laden
    let lang = 'de';
    if (m.chat) {
      const chatDb = await loadChatById(m.chat);
      if (chatDb && chatDb.sprache) lang = chatDb.sprache;
    }
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) return send({ chat: m.chat, text: t('not_admin', lang) });
    const toBan = args[0];
    if (m.platform === 'discord') {
      try {
        const guild = await platformApi.guilds.fetch(m.guildId);
        const member = await guild.members.fetch(toBan.replace(/[^0-9]/g, ''));
        await member.ban();
        return send({ chat: m.chat, text: t('user_banned', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('ban_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.banChatMember(m.chat, toBan.replace(/[^0-9]/g, ''));
        return send({ chat: m.chat, text: t('user_banned', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('ban_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('ban_not_supported', lang) });
    }
  },
  get description() {
    // Dynamische Beschreibung je nach Chat-Sprache (m.chat ist immer vorhanden)
    return async function(m) {
      const chatDb = await loadChatById(m.chat);
      const lang = (chatDb && chatDb.sprache) || 'de';
      return t('ban_description', lang);
    };
  }
};
