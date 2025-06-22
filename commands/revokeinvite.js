// commands/revokeinvite.js
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'revokeinvite',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('revokeinvite_description', 'de') || 'Setzt den Invite-Link der WhatsApp-Gruppe zurück.';
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    if (m.platform === 'whatsapp') {
      try {
        const code = await platformApi.groupRevokeInvite(m.chat);
        return send({ chat: m.chat, text: t('revokeinvite_success', lang, { code }) });
      } catch (e) { return send({ chat: m.chat, text: t('revokeinvite_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('revokeinvite_not_supported', lang) });
    }
  }
};
