// File: commands/dsgvo.js
// ------------------------
// Befehl: !dsgvo <info|zustimmen|verweigern>
// Erkennt automatisch WhatsApp, Telegram oder Discord und zeigt die
// passende Begrifflichkeit („Gruppe“ oder „Privatchat“) an.

const { loadChatById, saveChat, deleteChatById } = require('../db/chats');

module.exports = {
  name: 'dsgvo',
  aliases: ['agree'],
  description: 'DSGVO-Einwilligung für diesen Chat. Befehle: info, zustimmen, verweigern.',

  async execute({ args, m, send }) {
    const chatId = m.chat;
    const sub = (args[0] || '').toLowerCase();
    const platform = m.platform;         // 'whatsapp', 'telegram' oder 'discord'
    const raw = m.msgRaw;               // Original-Message Object aus dem Adapter

    // Hilfsfunktion: Erkenne, ob es sich um einen Gruppenchat handelt
    function isGroup() {
      if (platform === 'whatsapp') {
        // WhatsApp-Gruppen enden auf '@g.us'
        return chatId.endsWith('@g.us');
      }
      if (platform === 'telegram') {
        // Telegram-Gruppen/Channels haben negative IDs (z. B. '-1001234567890')
        // Privatchats sind positive IDs oder String ohne '-'
        return /^-/.test(chatId);
      }
      if (platform === 'discord') {
        // Discord: Discord.js-Client liefert msgRaw.channel.type
        // - 'DM' für Direct Messages
        // - 'GUILD_TEXT' oder 'GUILD_NEWS' für Server-Kanal
        const channelType = raw?.channel?.type;
        if (channelType === 'DM') return false;
        if (
          channelType === 'GUILD_TEXT' ||
          channelType === 'GUILD_NEWS' ||
          channelType === 'GUILD_PUBLIC_THREAD' ||
          channelType === 'GUILD_PRIVATE_THREAD'
        ) {
          return true;
        }
        // Falls unklar, standardmäßig auf false setzen
        return false;
      }
      // Fallback: alles andere gilt als Privatchat
      return false;
    }

    // Platform-spezifische Namensgebung
    function chatLabel() {
      if (isGroup()) {
        switch (platform) {
          case 'whatsapp':
            return 'WhatsApp-Gruppe';
          case 'telegram':
            return 'Telegram-Gruppe';
          case 'discord':
            return 'Discord-Server-Kanal';
          default:
            return 'Gruppe';
        }
      } else {
        switch (platform) {
          case 'whatsapp':
            return 'Privatchat';
          case 'telegram':
            return 'privater Telegram-Chat';
          case 'discord':
            return 'Direct Message';
          default:
            return 'Privatchat';
        }
      }
    }

    // DSGVO-Text (gekürzt; bei Bedarf z. B. auslagern oder erweitern)
    const summary = [
      '📋 *DSGVO-Information*',
      '_Schutz deiner Daten – kurz & klar erklärt!_',
      '',
      '🔹 *Verantwortlicher:*',
      '  NishiBot (Inhaber: Max Mustermann)',
      '',
      '🔹 *Datenarten:*',
      '  • Chat-ID  ',
      '  • Nutzungsstatistiken (z. B. Befehle)',
      '',
      '🔹 *Zweck der Verarbeitung:*',
      '  • Bot-Betrieb & Funktionalität',
      '  • Statistische Auswertung',
      '',
      '🔹 *Rechte der Betroffenen:*',
      '  1. Auskunft über gespeicherte Daten  ',
      '  2. Berichtigung unrichtiger Daten  ',
      '  3. Löschung („Recht auf Vergessenwerden“)',
      '  4. Einschränkung der Verarbeitung  ',
      '  5. Widerspruch gegen Datenverarbeitung  ',
      '  6. Datenübertragbarkeit',
      '',
      '🔹 *Speicherdauer:*',
      '  Daten werden gelöscht, wenn sie nicht mehr benötigt werden oder auf Löschwunsch.',
      '',
      '🔹 *Sicherheit:*',
      '  • Verschlüsselte Übertragung (TLS)  ',
      '  • Server in der EU, gesichert gegen unbefugten Zugriff',
      '',
      '🔹 *Kontakt & Beschwerden:*',
      '  • E-Mail: sebloidl12@gmail.com',
      '',
      '_Mehr Details:_\n' + '`!dsgvo info`'
    ].join('\n');

    // Wenn kein Unterbefehl angegeben, zeigen wir Hilfetext mit Optionen
    if (!sub) {
      return send({
        chat: chatId,
        text:
          summary +
          '\n\n*Verfügbare Befehle für diesen ' +
          chatLabel() +
          ':*' +
          '\n– `!dsgvo info`  Zeigt diese Übersicht' +
          '\n– `!dsgvo zustimmen`  Einwilligung erteilen' +
          '\n– `!dsgvo verweigern`  Bot im Chat deaktivieren'
      });
    }

    // Unterbefehl: info
    if (sub === 'info') {
      return send({ chat: chatId, text: summary });
    }

    // Unterbefehl: verweigern
    if (sub === 'verweigern') {
      // Lösche den Chat-Eintrag komplett (sofern vorhanden)
      await deleteChatById(chatId);
      return send({
        chat: chatId,
        text:
          '❌ *DSGVO nicht akzeptiert.*\n' +
          'Der Bot wurde in diesem ' +
          chatLabel() +
          ' deaktiviert – keine weiteren Befehle möglich.'
      });
    }

    // Unterbefehl: zustimmen
    if (sub === 'zustimmen') {
      // Lade existierenden Chat-Eintrag (falls vorhanden)
      let chatData = await loadChatById(chatId);

      // Wenn noch kein Chat-Eintrag, dann initialisieren wir Default-Felder
      if (!chatData) {
        chatData = {
          chatId: chatId,
          dsgvoAccepted: true,
          name: isGroup()
            ? getGroupNamePlaceholder()
            : chatLabel(), // z. B. 'Privatchat'
          closeGroup: false,
          isBanned: false,
          isAdmode: false,
          welcome: false,
          wwelcome: false,
          wwwelcome: false,
          beta: false,
          detect: true,
          sWelcome: 'Willkommen!',
          sprache: 'de',
          sBye: '',
          sPromote: '',
          sDemote: '',
          desc: true,
          descUpdate: true,
          stiker: false,
          delete: true,
          antiLink: false,
          chatbot: false,
          autoxpup: true,
          antiLinkk: false,
          antiLinkkall: false,
          expired: 0,
          antiBadword: true,
          antiSpam: false,
          antitroli: false,
          antiafk: false,
          antivirtex: true,
          viewonce: true,
          nsfw: false,
          simi: false,
          clear: true,
          clearTime: 0,
          nishi: 'Nishikigi Chisato',
          nishi1: './edit.mp4',
          nishi2: './edit.mp4',
          nishi3: './edit.mp4',
          nishi4: './edit.mp4',
          nishi5: './edit.mp4',
          nishi6: './edit.mp4',
          nishi7: './edit.mp4',
          nishi8: './edit.mp4',
          nishi9: './edit.mp4',
          nishi10: './edit.mp4',
          nishi11: './edit.mp4',
          nishi12: './img/in.jpg',
          nishi13: '!',
          nishi14: '!',
          muteUser: [],
          aliases: '',
          sprache: 'de'
        };
        // Falls wir in einer echten WhatsApp-Gruppe sind, könnten wir hier
        // den tatsächlichen Gruppennamen nachladen:
        // chatData.name = await conn.groupMetadata(chatId).subject;
      } else {
        // Wenn Der Chat-Eintrag schon existierte, setzen wir einfach das Flag
        chatData.dsgvoAccepted = true;
      }

      // Speichern (überschreibt vorhandenes Objekt in der verschlüsselten Datei)
      await saveChat(chatId, chatData);

      const okMsg = isGroup()
        ? '✅ *DSGVO akzeptiert.*\nDie ' +
          chatLabel() +
          ' ist jetzt aktiv. Der Bot bleibt hier.' 
        : '✅ *DSGVO akzeptiert.*\nDu kannst jetzt alle Bot-Commands in diesem ' +
          chatLabel() +
          ' nutzen.';

      return send({ chat: chatId, text: okMsg });
    }

    // Ungültiger Unterbefehl
    return send({
      chat: chatId,
      text:
        '❓ Ungültiger Befehl. Nutze:\n' +
        '`!dsgvo info`, `!dsgvo zustimmen` oder `!dsgvo verweigern`.'
    });

    // Hilfsfunktion: Platzhalter für Gruppenname, bis wir den echten Namen abrufen
    function getGroupNamePlaceholder() {
      switch (platform) {
        case 'whatsapp':
          return 'WhatsApp-Gruppe';
        case 'telegram':
          return 'Telegram-Gruppe';
        case 'discord':
          return 'Discord-Server';
        default:
          return 'Gruppe';
      }
    }
  }
};
