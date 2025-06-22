// File: commands/migrate.js
const fs = require('fs');
const path = require('path');
const { computeSn } = require('../utils/computeSn');
const { findByPlatform, registerUserWithData, saveUser } = require('../db/users');
const { generateSaveKey } = require('../utils/saveKey'); // Falls du die Funktion separat hast
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

const OLD_DB_PATH = path.join(__dirname, '..', 'database.json');

module.exports = {
  name: 'migrate',
  aliases: ['migrieren', 'olddata'],
  category: 'System',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('migrate_description', 'de') || 'Migriert deinen alten Account in das neue System.';
  },
  async execute({ m, args, send }) {
    let lang = 'de';
    try {
      const chatDb = await loadChatById(m.chat);
      if (chatDb && chatDb.language) lang = chatDb.language;
    } catch {}
    const platform = 'whatsapp';
    const platformId = m.sender;
    if (m.platform === 'whatsapp' && m.chat.endsWith('@g.us')) {
      return send({ chat: m.chat, text: t('migrate_private_only', lang) });
    }
    // Discord: Nur DM
    if (m.platform === 'discord' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: t('migrate_private_only', lang) });
    }
    // Telegram: Nur privat
    if (m.platform === 'telegram' && m.chat !== m.sender) {
      return send({ chat: m.chat, text: t('migrate_private_only', lang) });
    }
    // Info-Text
    if ((args[0] || '').toLowerCase() === 'info') {
      return send({
        chat: m.chat,
        text: t('migrate_info', lang)
      });
    }
    // Nur WhatsApp zulassen
    if (!platformId.endsWith('@s.whatsapp.net')) {
      return send({ chat: m.chat, text: t('migrate_only_whatsapp', lang) });
    }
    // Prüfe, ob Nutzer bereits registriert ist
    const existing = await findByPlatform(platform, platformId);
    if (existing) {
      return send({ chat: m.chat, text: t('migrate_already_registered', lang) });
    }
    // Alte DB laden
    let oldDb;
    try {
      const raw = fs.readFileSync(OLD_DB_PATH, 'utf8');
      oldDb = JSON.parse(raw);
    } catch (e) {
      console.error('❌ Fehler beim Einlesen der alten Datenbank:', e);
      return send({ chat: m.chat, text: t('migrate_db_error', lang) });
    }
    // Seriennummer aus Telefonnummer berechnen
    const serialNumber = computeSn(platformId);
    const oldUserData = (oldDb && oldDb.users && oldDb.users[serialNumber]) || (oldDb && oldDb[serialNumber]);
    if (!oldUserData) {
      return send({ chat: m.chat, text: t('migrate_no_data', lang) });
    }
    // Registrierung + Migration ins neue System
    try {
      const newUser = await registerUserWithData(platform, platformId, oldUserData);
      // Save-Key generieren, falls nicht vorhanden
      if (!newUser.saveKey) {
        newUser.saveKey = generateSaveKey();
        await saveUser(newUser);
      }
      await send({
        chat: m.sender,
        text: t('migrate_success_private', lang, { saveKey: newUser.saveKey })
      });
      return send({
        chat: m.chat,
        text: t('migrate_success', lang)
      });
    } catch (e) {
      console.error('❌ Fehler bei der Migration:', e);
      send({ chat: m.chat, text: t('migrate_transfer_error', lang) });
    }
  }
};