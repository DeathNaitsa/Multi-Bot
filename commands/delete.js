// commands/delete.js
// Plattformübergreifender Delete-Command für Gruppen
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { aliases } = require('./ping');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'delete',
  aliases: ['del'],
  get description() {
    // Dynamische Beschreibung je nach Chat-Sprache (m.chat ist immer vorhanden)
    return async function(m) {
      const chatDb = await loadChatById(m.chat);
      const lang = (chatDb && chatDb.sprache) || 'de';
      return t('delete_description', lang);
    };
  },
  description: 'Löscht eine Nachricht in der Gruppe (sofern möglich und erlaubt).',
  async execute({ m, args, send, platformApi }) {
    // Sprache aus Chat-DB laden
    const chatDb = await loadChatById(m.chat);
    const lang = (chatDb && chatDb.sprache) || 'de';
    if (!m.chat || m.chat === m.sender) {
      return send({ chat: m.chat, text: t('delete_not_group', lang) });
    }
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) {
      return send({ chat: m.chat, text: t('delete_bot_not_admin', lang) });
    }
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) {
      return send({ chat: m.chat, text: t('delete_not_admin', lang) });
    }
    if (m.platform === 'discord') {
      try {
        if (!m.msgRaw) return send({ chat: m.chat, text: t('delete_not_found', lang) });
        await m.msgRaw.delete();
        return send({ chat: m.chat, text: t('delete_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('delete_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        if (!m.msgRaw?.message_id) return send({ chat: m.chat, text: t('delete_not_found', lang) });
        await platformApi.deleteMessage(m.chat, m.msgRaw.message_id);
        return send({ chat: m.chat, text: t('delete_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('delete_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.sendMessage && m.msgRaw?.key) {
          // Eigene Nachricht löschen (immer)
          const ownMessageKey = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.msgRaw.key.id,
            participant: m.msgRaw.key.participant || m.msgRaw.key.remoteJid
          };
          await platformApi.sendMessage(m.chat, { delete: ownMessageKey });
          // Getaggte Nachricht löschen (z.B. bei Reply oder Mention)
          let taggedKeys = [];
          if (m.msgRaw?.message?.extendedTextMessage?.contextInfo?.stanzaId) {
            taggedKeys.push({
              remoteJid: m.chat,
              fromMe: false,
              id: m.msgRaw.message.extendedTextMessage.contextInfo.stanzaId,
              participant: m.msgRaw.message.extendedTextMessage.contextInfo.participant || m.msgRaw.key.remoteJid
            });
          }
          if (m.mentionedJid) {
            const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : [m.mentionedJid];
            for (const jid of mentioned) {
              taggedKeys.push({
                remoteJid: m.chat,
                fromMe: false,
                id: jid,
                participant: jid
              });
            }
          }
          // Lösche alle getaggten Nachrichten
          for (const key of taggedKeys) {
            await platformApi.sendMessage(m.chat, { delete: key });
          }
          return send({ chat: m.chat, text: t('delete_success_multi', lang) });
        } else {
          return send({ chat: m.chat, text: t('delete_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('delete_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('delete_not_supported', lang) });
    }
  }
};
