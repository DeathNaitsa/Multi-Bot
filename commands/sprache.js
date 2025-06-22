const { loadChatById, saveChat } = require('../db/chats');
const { isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'sprache',
  aliases: ['language', 'lang'],
  get description() {
    return t('language_description', 'de');
  },
  usage: '<de|en>',
  async execute({ m, args, send, platformApi }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    // Aktivierte Gruppen-Erkennung für mehrere Plattformen (ohne @s.whatsapp.net):
    const isGroup = m.chat && (
      m.chat.endsWith('@g.us') ||
      m.chat.endsWith('@group') ||
      m.chat.endsWith('-group') ||
      m.chat.endsWith('@broadcast')
    );
    let userIsAdmin = true;
    if (isGroup) {
      userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
      if (!userIsAdmin) return send({ chat: m.chat, text: t('not_admin', lang) });
    }
    const newLang = (args[0] || '').toLowerCase();
    if (!['de', 'en'].includes(newLang)) {
      return send({ chat: m.chat, text: t('language_usage', lang) });
    }
    chat.language = newLang;
    await saveChat(m.chat, chat);
    return send({ chat: m.chat, text: t('language_set', newLang) });
  }
};
