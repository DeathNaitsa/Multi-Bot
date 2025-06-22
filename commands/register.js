// File: commands/register.js
const { createHash } = require('crypto');
const { findByPlatform, createOrReuseUser, saveUser } = require('../db/users');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'register',
  aliases: ['reg'],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('register_description', 'de') || 'Registriere dich im Format: !reg Name.Alter';
  },
  async execute({ args, m, send }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    const platform = m.platform;
    const platformId = m.sender;
    const text = args.join(' ');
    if (m.platform === 'whatsapp' && m.chat.endsWith('@g.us')) {
      return send({ chat: m.chat, text: t('register_private_only', lang) });
    }
    // Discord: Nur DM
    if (m.platform === 'discord' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: t('register_private_only', lang) });
    }
    // Telegram: Nur privat
    if (m.platform === 'telegram' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: t('register_private_only', lang) });
    }
    // 1) Prüfen, ob schon registriert
    const oldUser = await findByPlatform(platform, platformId);
    if (oldUser) {
      return send({ chat: m.chat, text: t('register_already', lang) });
    }
    // 2) Format «Name.Alter» prüfen
    const Reg = /\|?(.*?)([.|] *?)([0-9]{1,3})$/i;
    if (!Reg.test(text)) {
      return send({ chat: m.chat, text: t('register_format', lang) });
    }
    const [, nameRaw, , ageRaw] = text.match(Reg);
    const name = nameRaw.trim();
    const age = parseInt(ageRaw, 10);
    if (!name) {
      return send({ chat: m.chat, text: t('register_no_name', lang) });
    }
    if (isNaN(age) || age < 5 || age > 120) {
      return send({ chat: m.chat, text: t('register_invalid_age', lang) });
    }
    // 3) Passwort-Hash MD5(name)
    const passwordHash = createHash('md5').update(name).digest('hex');
    // 4) User anlegen / wiederverwenden
    const initialFields = { name, age, language: lang, roles: [] };
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
    await send({ chat: m.sender, text: t('register_private_success', lang, { sn: newUser.serialNumber, saveKey: newUser.saveKey }) });
    return send({
      chat: m.chat,
      text: t('register_success', lang, { name, age })
    });
  }
};