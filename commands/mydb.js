// commands/mydb.js
// Gibt dem User alle seine gespeicherten Daten zurück
const fs = require('fs');
const path = require('path');
const { findByPlatform } = require('../db/users');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'mydb',
  aliases: [],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('mydb_description', 'de') || 'Zeigt deine gespeicherten Userdaten an';
  },
  async execute({ m, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    const userId = m.sender || m.from;
    const platform = m.platform;
    const lid = m.lid;
    const user = await findByPlatform(platform, userId, lid);
    if (!user) return send({ chat: m.chat, text: t('mydb_no_data', lang) });
    const data = JSON.stringify(user, null, 2);
    // Plattformabhängiges Limit
    let limit = 3500;
    if (m.platform === 'discord') limit = 4000;
    if (m.platform === 'whatsapp') limit = 60000;
    // Telegram kann meist auch mehr als 3500, aber wir lassen es erstmal so
    if (data.length < limit) {
      send({ chat: m.chat, text: t('mydb_data', lang) + '\n```json\n' + data + '\n```' });
    } else {
      const buffer = Buffer.from(data, 'utf8');
      send({ chat: m.chat, text: t('mydb_too_large', lang), file: { buffer, fileName: `${userId}.txt`, mimetype: 'text/plain' } });
    }
  }
};
