// commands/unban.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'unban',
  get description() {
    return t('unban_description', 'de');
  },
  async execute({ m, args, send, platformApi }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) return send({ chat: m.chat, text: t('unban_not_admin', lang) });
    const toUnban = args[0];
    if (m.platform === 'discord') {
      try {
        const guild = await platformApi.guilds.fetch(m.guildId);
        await guild.members.unban(toUnban.replace(/[^0-9]/g, ''));
        return send({ chat: m.chat, text: t('unban_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('unban_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.unbanChatMember(m.chat, toUnban.replace(/[^0-9]/g, ''));
        return send({ chat: m.chat, text: t('unban_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('unban_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('unban_not_supported', lang) });
    }
  }
};
