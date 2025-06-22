// commands/listadmins.js
const { getGroupMembers } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'listadmins',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('listadmins_description', 'de') || 'Listet alle Admins der Gruppe auf.';
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const members = await getGroupMembers(m, platformApi);
    const admins = members.filter(u => u.isAdmin);
    if (!admins.length) return send({ chat: m.chat, text: t('listadmins_none', lang) });
    const text = admins.map(a => a.username || a.id).join('\n');
    return send({ chat: m.chat, text: t('listadmins_list', lang, { admins: text }) });
  }
};
