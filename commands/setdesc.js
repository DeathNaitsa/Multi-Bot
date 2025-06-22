// commands/setdesc.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'setdesc',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('setdesc_description', 'de') || 'Setzt die Gruppenbeschreibung (sofern möglich).';
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
    if (!userIsAdmin) return send({ chat: m.chat, text: t('setdesc_not_admin', lang) });
    const newDesc = args.join(' ');
    if (!newDesc) return send({ chat: m.chat, text: t('setdesc_no_desc', lang) });
    if (m.platform === 'discord') {
      try {
        const channel = await platformApi.channels.fetch(m.chat);
        await channel.setTopic(newDesc);
        return send({ chat: m.chat, text: t('setdesc_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('setdesc_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.setChatDescription(m.chat, newDesc);
        return send({ chat: m.chat, text: t('setdesc_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('setdesc_error', lang, { error: e.message }) }); }
    } else if (m.platform === 'whatsapp') {
      try {
        await platformApi.groupUpdateDescription(m.chat, newDesc);
        return send({ chat: m.chat, text: t('setdesc_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('setdesc_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('setdesc_not_supported', lang) });
    }
  }
};
