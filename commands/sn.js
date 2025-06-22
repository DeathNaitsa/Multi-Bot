const { findByPlatform } = require('../db/users');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'sn',
  aliases: ['serial', 'nummer', 'serialnumber'],
  get description() {
    // Default to German if no language context
    return t('sn_description', 'de');
  },

  async execute({ m, send }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    const user = await findByPlatform(m.platform, m.sender);
    if (!user || !user.serialNumber) {
      return send({
        chat: m.chat,
        text: t('sn_not_found', lang)
      });
    }
    return send({
      chat: m.chat,
      text: t('sn_found', lang, { sn: user.serialNumber })
    });
  }
};