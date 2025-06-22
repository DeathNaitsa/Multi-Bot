// commands/unpin.js
// Plattformübergreifender Unpin-Command für Gruppen
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'unpin',
  get description() {
    return t('unpin_description', 'de');
  },
  async execute({ m, args, send, platformApi }) {
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    if (!m.chat || m.chat === m.sender) {
      return send({ chat: m.chat, text: t('pin_only_group', lang) });
    }
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) {
      return send({ chat: m.chat, text: t('pin_wa_not_available', lang) });
    }
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) {
      return send({ chat: m.chat, text: t('pin_not_admin', lang) });
    }
    if (m.platform === 'discord') {
      try {
        if (!m.msgRaw) return send({ chat: m.chat, text: t('pin_not_found', lang) });
        await m.msgRaw.unpin();
        return send({ chat: m.chat, text: t('unpin_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('unpin_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        if (!m.msgRaw?.message_id) return send({ chat: m.chat, text: t('pin_not_found', lang) });
        await platformApi.unpinChatMessage(m.chat, m.msgRaw.message_id);
        return send({ chat: m.chat, text: t('unpin_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('unpin_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.sendMessage && m.msgRaw?.key) {
          let timeArg = args[0] || '24h';
          let duration = 86400; // Default 24h
          if (/^\d+$/.test(timeArg)) {
            duration = parseInt(timeArg, 10);
          } else if (/^(\d+)([dh])$/.test(timeArg)) {
            const [, num, unit] = timeArg.match(/^(\d+)([dh])$/);
            if (unit === 'd') duration = parseInt(num, 10) * 86400;
            if (unit === 'h') duration = parseInt(num, 10) * 3600;
          }
          const messageKey = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.msgRaw.key.id,
            participant: m.msgRaw.key.participant || m.msgRaw.key.remoteJid
          };
          let response = await platformApi.sendMessage(
            m.chat,
            {
              pin: messageKey,
              type: 0, // 0 zum Entpinnen
              time: duration
            }
          );
          return send({ chat: m.chat, text: t('unpin_success', lang) });
        } else {
          return send({ chat: m.chat, text: t('pin_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('unpin_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('pin_not_supported', lang) });
    }
  }
};
