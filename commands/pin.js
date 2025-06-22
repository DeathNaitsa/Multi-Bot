// commands/pin.js
// Plattformübergreifender Pin-Command für Gruppen
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'pin',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('pin_description', 'de') || 'Pinnt eine Nachricht in der Gruppe (sofern möglich und erlaubt).';
  },
  async execute({ m, args, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    if (!m.chat || m.chat === m.sender) {
      return send({ chat: m.chat, text: t('pin_only_group', lang) });
    }
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) {
      return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    }
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) {
      return send({ chat: m.chat, text: t('not_admin', lang) });
    }
    if (m.platform === 'discord') {
      try {
        if (!m.msgRaw) return send({ chat: m.chat, text: t('pin_not_found', lang) });
        await m.msgRaw.pin();
        return send({ chat: m.chat, text: t('pin_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('pin_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        if (!m.msgRaw?.message_id) return send({ chat: m.chat, text: t('pin_not_found', lang) });
        await platformApi.pinChatMessage(m.chat, m.msgRaw.message_id);
        return send({ chat: m.chat, text: t('pin_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('pin_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.sendMessage && m.msgRaw?.key) {
          // Zeitspanne aus args[0] (z.B. 24h, 7d, 30d, Sekunden) oder Default 24h
          let timeArg = args[0] || '24h';
          let duration = 86400; // Default 24h
          if (/^\d+$/.test(timeArg)) {
            duration = parseInt(timeArg, 10);
          } else if (/^(\d+)([dh])$/.test(timeArg)) {
            const [, num, unit] = timeArg.match(/^(\d+)([dh])$/);
            if (unit === 'd') duration = parseInt(num, 10) * 86400;
            if (unit === 'h') duration = parseInt(num, 10) * 3600;
          }
          // messageKey: getaggte Nachricht (Reply/Mention) bevorzugen, sonst eigene
          let messageKey = null;
          if (m.msgRaw?.message?.extendedTextMessage?.contextInfo?.stanzaId) {
            messageKey = {
              remoteJid: m.chat,
              fromMe: false,
              id: m.msgRaw.message.extendedTextMessage.contextInfo.stanzaId,
              participant: m.msgRaw.message.extendedTextMessage.contextInfo.participant || m.msgRaw.key.remoteJid
            };
          } else {
            messageKey = {
              remoteJid: m.chat,
              fromMe: false,
              id: m.msgRaw.key.id,
              participant: m.msgRaw.key.participant || m.msgRaw.key.remoteJid
            };
          }
          // Debug-Ausgaben (optional)
          // console.log('Pin-Befehl - Eingehende Nachricht:', m.msgRaw.message);
          // console.log('Erstellter messageKey:', messageKey);
          // console.log('Dauer:', duration);
          // Sende die Pin-Nachricht (Typ 1 = anpinnen)
          let response = await platformApi.sendMessage(
            m.chat,
            {
              pin: messageKey,
              type: 1, // 1 zum Anpinnen
              time: duration
            }
          );
          return send({ chat: m.chat, text: t('pin_success_time', lang, { duration }) });
        } else {
          return send({ chat: m.chat, text: t('pin_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('pin_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('pin_not_supported', lang) });
    }
  }
};
