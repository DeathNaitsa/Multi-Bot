// commands/mute.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'mute',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('mute_description', 'de') || 'Stummschalten eines Users (sofern möglich).';
  },
  async execute({ m, args, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) return send({ chat: m.chat, text: t('mute_not_admin', lang) });
    const toMute = args[0];
    if (m.platform === 'discord') {
      try {
        const guild = await platformApi.guilds.fetch(m.guildId);
        const member = await guild.members.fetch(toMute.replace(/[^0-9]/g, ''));
        await member.timeout(60 * 60 * 1000); // 1h Timeout
        return send({ chat: m.chat, text: t('mute_success_discord', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('mute_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.restrictChatMember(m.chat, toMute.replace(/[^0-9]/g, ''), { can_send_messages: false });
        return send({ chat: m.chat, text: t('mute_success_telegram', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('mute_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('mute_not_supported', lang) });
    }
  }
};
