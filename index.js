// File: index.js
const fs   = require('fs');
const path = require('path');
const { loadChatById } = require('./db/chats');

// Hier die User‐DB-Funktionen importieren
const {
  findByPlatform,
  createOrReuseUser,
  saveUser
} = require('./db/users');

// 1) Alle Commands laden
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach((file) => {
  if (!file.endsWith('.js')) return;
  const cmd = require(path.join(commandsPath, file));
  commands.set(cmd.name, cmd);
  if (Array.isArray(cmd.aliases)) {
    cmd.aliases.forEach(alias => commands.set(alias, cmd));
  }
});

// 2) Zentrales Dispatching mit EXP-Increment und DSGVO-Prüfung
async function handleIncoming(m, send) {
  let user = await findByPlatform(m.platform, m.sender);

  // 2. Nur wenn User existiert, XP vergeben und Level-Up prüfen
  if (user) {
    // Falls Felder noch fehlen, initiale Werte setzen
    user.exp = user.exp || 0;
    user.level = user.level || 1;
    user.prestige = user.prestige || 0;
    user.canPrestige = user.canPrestige || false;

    // 3. Zufällige XP zw. 5 und 20 vergeben
    const minXP = 5;
    const maxXP = 20;
    const xpGain = Math.floor(Math.random() * (maxXP - minXP + 1)) + minXP;
    user.exp += xpGain;

    // 4. Dynamische XP-Schwelle berechnen
    //    Hier Beispiel: Grundschwelle 100 + 10 * (Level-1) + Zufallswert zw. -15 und +15
    const baseThreshold = 100;
    const linearIncrease = 10 * (user.level - 1);
    const variance = 15; // max. +/-15 XP Abweichung
    const xpThreshold = baseThreshold + linearIncrease 


    // 5. Prüfen, ob Level-Up fällig ist
    if (user.exp >= xpThreshold) {
      let teds;
      user.level += 1;
      user.exp = 0; // XP nach Level-Up zurücksetzen
      teds = `🎉 [LEVEL-UP] ${m.platform}:${m.sender} ist nun Level ${user.level}!`;

      // 6. Prestige-Freischaltung bei Level 250
      if (user.level >= 250 && !user.canPrestige) {
        user.canPrestige = true;
        teds += `\n🏆 [PRESTIGE FREIGESCHALTET] ${m.platform}:${m.sender} kann jetzt prestigen.`;
      }
      send({ chat: m.chat, text: teds });
    }

    // 7. Änderungen speichern
    await saveUser(user);
  }

  // Wenn es kein Command ist (kein Präfix), brauchen wir nichts weiter tun:
  const prefix = '!';
  if (!m.text.startsWith(prefix)) return;

  // 2b) Command‐Name und Argumente extrahieren
  const withoutPrefix = m.text.slice(prefix.length).trim();
  const [commandName, ...args] = withoutPrefix.split(/\s+/);
  const commandKey = commandName.toLowerCase();

  const cmd = commands.get(commandKey);
  if (!cmd) {
    return send({ chat: m.chat, text: `Unbekannter Befehl: ${commandKey}` });
  }

  // 2c) DSGVO-Prüfung (außer für Ausnahmen)
  if (!['register','dsgvo','unregister','connect','verify','ping'].includes(cmd.name)) {
    const chatData = await loadChatById(m.chat);
    if (!chatData || !chatData.dsgvoAccepted) {
      return send({
        chat: m.chat,
        text:
          '🚫 Bitte akzeptiere zuerst die DSGVO:\n' +
          '`!dsgvo info` – Info anzeigen\n' +
          '`!dsgvo zustimmen` – Einwilligung erteilen'
      });
    }
  }

  // 2d) Befehl ausführen
  try {
    // Plattform-API bestimmen
    let platformApi = null;
    if (m.platform === 'whatsapp') platformApi = global.connWA;
    if (m.platform === 'telegram') platformApi = global.botTelegram;
    if (m.platform === 'discord')  platformApi = global.discordClient;

    await cmd.execute({ command: commandKey, args, m, send, platformApi });
  } catch (e) {
    console.error(`Fehler in Command ${commandKey}:`, e);
    await send({ chat: m.chat, text: 'Fehler beim Ausführen des Befehls.' });
  }
// ...existing code...  } catch (e) {

}

// 3) Adapter starten (WhatsApp, Telegram, Discord)
;(async () => {
  // 3.1) WhatsApp
  let sessionId;
  try {
    sessionId = await require('./adapters/whatsapp')(handleIncoming);
  } catch (e) {
    console.error('WhatsApp-Adapter konnte nicht starten:', e);
    process.exit(1);
  }
  console.log(`WhatsApp-Adapter gestartet mit Session-ID: ${sessionId}`);
  global.connWA = sessionId;

  // 3.2) Telegram
  const botTelegram = require('./adapters/telegram')(handleIncoming);
  global.botTelegram = botTelegram;
  console.log('Telegram-Adapter gestartet.');

  // 3.3) Discord
  const discordClient = require('./adapters/discord')(handleIncoming);
  global.discordClient = discordClient;
  console.log('Discord-Adapter gestartet.');

  console.log('Bot läuft auf WhatsApp, Telegram und Discord. Wartet auf Nachrichten …');
})();
