// commands/listmembers.js
const { getGroupMembers } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
module.exports = {
  name: 'listmembers',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('listmembers_description', 'de') || 'Listet alle Mitglieder der Gruppe auf.';
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
    const members = await getGroupMembers(m, platformApi);
    if (!members.length) return send({ chat: m.chat, text: t('listmembers_none', lang) });
    const text = members.map(a => a.username || a.id).join('\n');
    return send({ chat: m.chat, text: t('listmembers_list', lang, { members: text }) });
  }
};
