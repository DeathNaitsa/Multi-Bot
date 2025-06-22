// commands/gcdb.js
// Gibt Admins die gespeicherten Daten der aktuellen Gruppe zurück
const fs = require('fs');
const path = require('path');
const { loadChatById } = require('../db/chats');
const { isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'gcdb',
  aliases: ['groupdb', 'chatdb'],
  description: '', // Dynamisch, siehe Getter unten
  usage: '',
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return (
      t('gcdb_description', 'de') + '\n' +
      t('gcdb_description', 'en')
    );
  },
  async execute({ m, send, platformApi }) {
    const chatId = m.chat;
    if (!chatId) return send({ chat: m.chat, text: t('gcdb_no_chatid', 'de') });
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) return send({ chat: m.chat, text: t('not_admin', 'de') });
    const chat = await loadChatById(chatId);
    if (!chat) return send({ chat: m.chat, text: t('gcdb_no_data', 'de') });
    const lang = chat.language || 'de';
    const data = JSON.stringify(chat, null, 2);
    // Plattformabhängiges Limit (z.B. Discord größer)
    const limit = m.platform === 'discord' ? 180000 : 60000;
    if (data.length < limit) {
      send({ chat: m.chat, text: t('gcdb_data', lang) + '\n```json\n' + data + '\n```' });
    } else {
      const buffer = Buffer.from(data, 'utf8');
      send({
        chat: m.chat,
        text: t('gcdb_too_large', lang),
        file: { buffer, fileName: `${chatId}.json`, mimetype: 'application/json' }
      });
    }
  }
};
