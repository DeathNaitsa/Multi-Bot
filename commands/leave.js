
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'leave',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Gibt die Beschreibung in der Sprache des Chats zurück (Standard: de, Fallback: en)
    let lang = 'de';
    try {
      if (typeof this._lastLang === 'string') lang = this._lastLang;
    } catch {}
    return t('leave_description', lang) || t('leave_description', 'en');
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('leave_only_group', lang) });
    if (m.platform === 'whatsapp') {
      try {
        await platformApi.groupLeave(m.chat);
        return send({ chat: m.chat, text: t('leave_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('leave_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('leave_not_supported', lang) });
    }
  }
};
