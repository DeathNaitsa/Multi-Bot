// commands/unlock.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'unlock',
  get description() {
    return t('unlock_description', 'de');
  },
  async execute({ m, send, platformApi }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    if (m.platform === 'whatsapp') {
      try {
        await platformApi.groupSettingUpdate(m.chat, 'not_announcement');
        return send({ chat: m.chat, text: t('unlock_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('unlock_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('unlock_not_supported', lang) });
    }
  }
};
