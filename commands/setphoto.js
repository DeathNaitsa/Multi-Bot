// commands/setphoto.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'setphoto',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('setphoto_description', 'de') || 'Setzt das Gruppenbild (sofern möglich).';
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
    if (!userIsAdmin) return send({ chat: m.chat, text: t('setphoto_not_admin', lang) });
    if (!args[0]) return send({ chat: m.chat, text: t('setphoto_no_url', lang) });
    if (m.platform === 'discord') {
      try {
        const channel = await platformApi.channels.fetch(m.chat);
        await channel.setIcon(args[0]);
        return send({ chat: m.chat, text: t('setphoto_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('setphoto_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.setChatPhoto(m.chat, args[0]);
        return send({ chat: m.chat, text: t('setphoto_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('setphoto_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('setphoto_not_supported', lang) });
    }
  }
};
