// File: commands/setpw.js
// ------------------------
// Command für Bot-Chat (WhatsApp/Telegram/Discord), mit dem ein Nutzer sein Passwort setzt.
// Aufruf im Chat: "!setpw meinNeuesPasswort"
const { findByPlatform ,saveUser} = require('../db/users');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

// Pfad zur DB-Datei
const dbPath = path.join(__dirname, '..', 'db', 'users.json');

module.exports = {
  name: 'setpw',
  aliases: ['setpassword'],
  description: 'Setzt dein Web-Passwort (nur im Chat nutzen!)',
  options: [],

  async execute({ m, send, args }) {
    // m: { sender, chat, text, msgRaw, … }
    // send: send({ chat, text, quoted })
    // args: [ '<passwort>' ]

    if (!args[0]) {
      return send({ chat: m.chat, text: '❌ Bitte gib ein Passwort an: `!setpw <passwort>`' });
    }
console.log('setpw args:', args);
    const neuesPw = args[0].trim();
    if (neuesPw.length < 4) {
      return send({ chat: m.chat, text: '❌ Passwort zu kurz (min. 4 Zeichen).' });
    }

    // ID des Nutzers = m.sender (z.B. "+49170…@s.whatsapp.net" oder Discord-ID)
    const userId = m.sender;
        const user = await findByPlatform(m.platform, userId);
    if (!user) {
      return send({ chat: m.chat, text: '❗ Du bist nicht registriert.' });
    }
    let userObj = user

    // Berechne MD5-Hash
    const hash = createHash('md5').update(neuesPw).digest('hex');
    console.log('Neues Passwort-Hash:', hash);
    console.log('UserObj vor dem Setzen des Passworts:', userObj);
    console.log('UserObj Accounts:', userObj.accounts);

    userObj.accounts[0].passwordHash = hash;
    userObj.accounts[0].registered = true;

await saveUser(user);
console.log('UserObj nach dem Setzen des Passworts:', userObj);
console.log('UserObj Accounts nach dem Setzen des Passworts:', userObj.accounts);
console.log('UserObj Accounts Passwort-Hash:', userObj.accounts.passwordHash);
    return send({ chat: m.chat, text: '✅ Dein Passwort wurde gesetzt. Du kannst dich nun im Web einloggen.' });
  }
};
