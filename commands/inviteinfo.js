// commands/inviteinfo.js
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'inviteinfo',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    return t('inviteinfo_description', 'de') + '\n' + t('inviteinfo_description', 'en');
  },
  async execute({ args, send, platformApi, m }) {
    const code = args[0];
    // Sprache aus Chat-DB, falls Kontext vorhanden
    let lang = 'de';
    if (m && m.chat) {
      try {
        const chat = await loadChatById(m.chat);
        if (chat && chat.language) lang = chat.language;
      } catch {}
    }
    if (!code) return send({ chat: m?.chat || null, text: t('inviteinfo_no_code', lang) });
    try {
      const response = await platformApi.groupGetInviteInfo(code);
      return send({ chat: m?.chat || null, text: t('inviteinfo_info', lang, { info: JSON.stringify(response) }) });
    } catch (e) {
      return send({ chat: m?.chat || null, text: t('inviteinfo_error', lang, { error: e.message }) });
    }
  }
};
