// File: commands/join.js
const { URL } = require('url');

module.exports = {
  name: 'join',
  description: 'Tritt einer Plattform bei (WhatsApp, Telegram, Discord) via Invite-Link',

  /**
   * execute erhält { args, m, send }:
   * - args: Text nach dem Präfix, z. B. der Invite-Link
   * - m: Nachricht-Objekt mit m.platform, m.from, m.chat, etc.
   * - send: Funktion, um { chat, text } zurückzusenden
   */
  async execute({ args, m, send }) {
    const text = args.join(' ').trim();
    if (!text) {
      return send({ chat: m.chat, text: '❗ Bitte gib einen Einladungslink an, z. B. `!join https://chat.whatsapp.com/…`' });
    }

    // 1) Telegram‐Invite erkennen: t.me/joinchat/… oder t.me/+…
    const tgRegex = /(?:https?:\/\/)?t\.me\/(?:joinchat\/|\+)([A-Za-z0-9_-]+)/i;
    const tgMatch = text.match(tgRegex);
    if (tgMatch) {
      const inviteLink = text; // z. B. "https://t.me/joinchat/ABCDEFGH"
      try {
        // global.botTelegram sollte dein Telegram‐Bot‐Instance sein
        await global.botTelegram.joinChat(inviteLink);
        return send({ chat: m.chat, text: '✅ Bot ist der Telegram-Gruppe beigetreten.' });
      } catch (e) {
        console.error('Telegram: Fehler beim Beitreten:', e);
        return send({ chat: m.chat, text: '❌ Fehler: Bot konnte der Telegram-Gruppe nicht beitreten.' });
      }
    }

    // 2) WhatsApp‐Invite erkennen: chat.whatsapp.com/…
    const waRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9]+)/i;
    const waMatch = text.match(waRegex);
    if (waMatch) {
      const inviteCode = waMatch[1]; // z. B. "ABCDEFGH"
      try {
        // global.connWA ist deine Baileys-Instanz
        await global.connWA.groupAcceptInvite(inviteCode);
        return send({ chat: m.chat, text: '✅ Bot ist der WhatsApp-Gruppe beigetreten.' });
      } catch (e) {
        console.error('WhatsApp: Fehler beim Beitreten:', e);
        return send({ chat: m.chat, text: '❌ Fehler: Bot konnte der WhatsApp-Gruppe nicht beitreten.' });
      }
    }

    // 3) Discord‐Invite erkennen: discord.gg/… oder discord.com/invite/…
    const dcRegex = /(?:https?:\/\/)?(?:www\.)?discord(?:\.gg|(?:app)?\.com\/invite)\/([A-Za-z0-9]+)/i;
    const dcMatch = text.match(dcRegex);
    if (dcMatch) {
      // Bots können Discord-Server nicht automatisch per Invite-Link beitreten.
      // Wir liefern stattdessen den OAuth2-Invite-Link, damit ein Admin den Bot hinzufügt.
      const clientId = '1358149026159264027'
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=3072`;
      return send({
        chat: m.chat,
        text:
          'ℹ️ Bots können Discord-Server nicht selbst per Invite-Link beitreten. ' +
          'Bitte klicke auf den folgenden Link, um den Bot in deinen Server einzuladen:\n' +
          inviteUrl
      });
    }

    // 4) Kein passender Link gefunden
    return send({
      chat: m.chat,
      text:
        '❗ Keinen gültigen Einladungslink erkannt. ' +
        'Stelle sicher, dass es ein WhatsApp-, Telegram- oder Discord-Invite ist.'
    });
  }
};
