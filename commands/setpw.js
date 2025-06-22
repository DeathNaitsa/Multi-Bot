// File: commands/setpw.js
// ------------------------
// Command für Bot-Chat (WhatsApp/Telegram/Discord), mit dem ein Nutzer sein Passwort setzt.
// Aufruf im Chat: "!setpw meinNeuesPasswort"
const { findByPlatform ,saveUser} = require('../db/users');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

// Pfad zur DB-Datei
const dbPath = path.join(__dirname, '..', 'db', 'users.json');

module.exports = {
  name: 'setpw',
  aliases: ['setpassword'],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('setpw_description', 'de') || 'Setzt dein Web-Passwort (nur im Chat nutzen!)';
  },
  options: [],

  async execute({ m, send, args }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!args[0]) {
      return send({ chat: m.chat, text: t('setpw_no_pw', lang) });
    }
    const neuesPw = args[0].trim();
    if (neuesPw.length < 4) {
      return send({ chat: m.chat, text: t('setpw_too_short', lang) });
    }
    const userId = m.sender;
    const user = await findByPlatform(m.platform, userId);
    if (!user) {
      return send({ chat: m.chat, text: t('not_registered', lang) });
    }
    let userObj = user;
    // Berechne MD5-Hash
    const hash = createHash('md5').update(neuesPw).digest('hex');
    userObj.accounts[0].passwordHash = hash;
    userObj.accounts[0].registered = true;
    await saveUser(user);
    return send({ chat: m.chat, text: t('setpw_success', lang) });
  }
};
