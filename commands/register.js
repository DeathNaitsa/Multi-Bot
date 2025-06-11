// File: commands/register.js
const { createHash } = require('crypto');
const { findByPlatform, createOrReuseUser, saveUser } = require('../db/users');

module.exports = {
  name: 'register',
  aliases: ['reg'],
  description: 'Registriere dich im Format: !reg Name.Alter',

  async execute({ args, m, send }) {
    const platform = m.platform;   // 'whatsapp' oder 'telegram' oder 'discord'
    const platformId = m.sender;   // Telefonnummer, Telegram-ID oder Discord-ID
    const text = args.join(' ');
    if (m.platform === 'whatsapp' && m.chat.endsWith('@g.us')) {
      return send({ chat: m.chat, text: 'Bitte führe die Registrierung im Privat-Chat mit dem Bot durch (kein Gruppenchat).' });
    }
    // Discord: Nur DM
    if (m.platform === 'discord' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: 'Bitte führe die Registrierung im Privat-Chat mit dem Bot durch (DM).' });
    }
    // Telegram: Nur privat
    if (m.platform === 'telegram' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: 'Bitte führe die Registrierung im Privat-Chat mit dem Bot durch.' });
    }
    // 1) Prüfen, ob schon registriert
    const oldUser = await findByPlatform(platform, platformId);
    if (oldUser) {
      return send({ chat: m.chat, text: 'Du bist bereits registriert.' });
    }

    // 2) Format «Name.Alter» prüfen
    const Reg = /\|?(.*?)([.|] *?)([0-9]{1,3})$/i;
    if (!Reg.test(text)) {
      return send({ chat: m.chat, text: 'Falsches Format. !reg Name.Alter' });
    }
    const [, nameRaw, , ageRaw] = text.match(Reg);
    const name = nameRaw.trim();
    const age = parseInt(ageRaw, 10);

    if (!name) {
      return send({ chat: m.chat, text: 'Name darf nicht leer sein.' });
    }
    if (isNaN(age) || age < 5 || age > 120) {
      return send({ chat: m.chat, text: 'Ungültiges Alter.' });
    }

    // 3) Passwort-Hash MD5(name)
    const passwordHash = createHash('md5').update(name).digest('hex');

    // 4) User anlegen / wiederverwenden
    const initialFields = { name, age, language: 'de', roles: [] };
    const newUser = await createOrReuseUser(platform, platformId, initialFields);

    // 5) Account-Daten anhängen
    if (!Array.isArray(newUser.accounts)) newUser.accounts = [];
    if (!newUser.accounts.some(acc => acc.name === name && acc.passwordHash === passwordHash)) {
      newUser.accounts.push({
        name,
        age,
        passwordHash,
        sn: newUser.serialNumber,
        registered: true
      });
    }
    await saveUser(newUser);

    // 6) Save-Key privat senden & Bestätigung
    await send({ chat: m.sender, text: `Deine SN: ${newUser.serialNumber}\nDein Save-Key: ${newUser.saveKey}\n\n⚠️ Bewahre diesen Save-Key gut auf! Damit kannst du deinen Account wiederherstellen, falls du keinen Zugriff mehr auf deine Nummer/ID hast.` });
    return send({
      chat: m.chat,
      text: `Anmeldung erfolgreich!\n╭─「 Info 」\n│ Name: ${name}\n│ Alter: ${age} Jahre\n╰────\nDeine SN und dein Save-Key wurden dir privat zugesendet.\n\nDu kannst später weitere Nummern/IDs mit deinem Account verbinden.`
    });
  }
};