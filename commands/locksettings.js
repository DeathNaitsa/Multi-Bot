// commands/locksettings.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'locksettings',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('locksettings_description', 'de') || 'Nur Admins dürfen Gruppen-Einstellungen ändern (WhatsApp).';
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    if (m.platform === 'whatsapp') {
      try {
        await platformApi.groupSettingUpdate(m.chat, 'locked');
        return send({ chat: m.chat, text: t('locksettings_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('locksettings_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('locksettings_not_supported', lang) });
    }
  }
};
