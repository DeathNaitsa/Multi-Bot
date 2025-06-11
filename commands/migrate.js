// File: commands/migrate.js
const fs = require('fs');
const path = require('path');
const { computeSn } = require('../utils/computeSn');
const { findByPlatform, registerUserWithData, saveUser } = require('../db/users');
const { generateSaveKey } = require('../utils/saveKey'); // Falls du die Funktion separat hast

const OLD_DB_PATH = path.join(__dirname, '..', 'database.json');

module.exports = {
  name: 'migrate',
  aliases: ['migrieren', 'olddata'],
  category: 'System',
  description: 'Migriert deinen alten Account in das neue System.',
  async execute({ m, args, send }) {
    const platform = 'whatsapp';
    const platformId = m.sender;
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
    // Info-Text
    if ((args[0] || '').toLowerCase() === 'info') {
      return send({
        chat: m.chat,
        text: `📦 *Migration deiner alten Bot-Daten*

Wenn du den Bot schon früher verwendet hast (vor dem großen Update), kannst du deine alten Daten hierher übernehmen.

*🔄 Wie funktioniert das?*
• Du gibst einfach *!migrate* ein
• Der Bot sucht deine alten Daten (Seriennummer)
• Falls gefunden, werden sie in die neue Datenbank übernommen

*❗Wichtig:*
• Funktioniert *nur über WhatsApp*
• Wenn du bereits registriert bist, passiert nichts
• Deine alten Daten bleiben unverändert erhalten

Benutze jetzt *!migrate*, um deine alten Daten zu importieren.`
      });
    }

    // Nur WhatsApp zulassen
    if (!platformId.endsWith('@s.whatsapp.net')) {
      return send({ chat: m.chat, text: '❌ Dieser Befehl funktioniert nur über WhatsApp.' });
    }

    // Prüfe, ob Nutzer bereits registriert ist
    const existing = await findByPlatform(platform, platformId);
    if (existing) {
      return send({ chat: m.chat, text: '✅ Du bist bereits im neuen System registriert.' });
    }

    // Alte DB laden
    let oldDb;
    try {
      const raw = fs.readFileSync(OLD_DB_PATH, 'utf8');
      oldDb = JSON.parse(raw);
    } catch (e) {
      console.error('❌ Fehler beim Einlesen der alten Datenbank:', e);
      return send({ chat: m.chat, text: '❌ Fehler beim Einlesen der alten Datenbank.' });
    }

    // Seriennummer aus Telefonnummer berechnen
    const serialNumber = computeSn(platformId);
    const oldUserData = (oldDb && oldDb.users && oldDb.users[serialNumber]) || (oldDb && oldDb[serialNumber]);

    if (!oldUserData) {
      return send({ chat: m.chat, text: '❌ Es wurden keine alten Daten unter deiner Seriennummer gefunden.' });
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
        text: `✅ Migration erfolgreich!\nDein Save-Key: ${newUser.saveKey}\n\n⚠️ Bewahre diesen Save-Key gut auf! Damit kannst du deinen Account wiederherstellen, falls du keinen Zugriff mehr auf deine Nummer hast.`
      });
      return send({
        chat: m.chat,
        text: `Migration abgeschlossen! Dein Save-Key wurde dir privat zugesendet.`
      });
    } catch (e) {
      console.error('❌ Fehler bei der Migration:', e);
      send({ chat: m.chat, text: '❌ Fehler beim Übertragen der Daten. Bitte kontaktiere den Support.' });
    }
  }
};