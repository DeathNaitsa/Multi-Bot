// commands/unlocksettings.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'unlocksettings',
  get description() {
    return t('unlocksettings_description', 'de');
  },
  async execute({ m, send, platformApi }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    if (m.platform === 'whatsapp') {
      try {
        await platformApi.groupSettingUpdate(m.chat, 'unlocked');
        return send({ chat: m.chat, text: t('unlocksettings_success', lang) });
      } catch (e) { return send({ chat: m.chat, text: t('unlocksettings_error', lang, { error: e.message }) }); }
    } else {
      return send({ chat: m.chat, text: t('unlocksettings_not_supported', lang) });
    }
  }
};
