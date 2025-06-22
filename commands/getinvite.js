// commands/getinvite.js
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'getinvite',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    return t('getinvite_description', 'de') + '\n' + t('getinvite_description', 'en');
  },
  async execute({ m, send, platformApi }) {
    if (!m.chat || m.chat === m.sender) {
      // Sprache aus Chat-DB laden
      let lang = 'de';
      try {
        const chat = await loadChatById(m.chat);
        if (chat && chat.language) lang = chat.language;
      } catch {}
      return send({ chat: m.chat, text: t('getinvite_only_group', lang) });
    }
    if (m.platform === 'whatsapp') {
      try {
        const code = await platformApi.groupInviteCode(m.chat);
        return send({ chat: m.chat, text: t('getinvite_link', (await loadChatById(m.chat))?.language || 'de', { code }) });
      } catch (e) {
        return send({ chat: m.chat, text: t('getinvite_error', (await loadChatById(m.chat))?.language || 'de', { error: e.message }) });
      }
    } else {
      let lang = 'de';
      try {
        const chat = await loadChatById(m.chat);
        if (chat && chat.language) lang = chat.language;
      } catch {}
      return send({ chat: m.chat, text: t('getinvite_not_supported', lang) });
    }
  }
};
