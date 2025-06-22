// commands/kick.js
// Plattformübergreifender Kick-Command für Gruppen
const { isBotAdmin, isUserAdmin, getGroupMembers } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'kick',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    return t('kick_description', 'de') + '\n' + t('kick_description', 'en');
  },
  async execute({ m, args, send, platformApi }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    // Nur in Gruppen
    if (!m.chat || m.chat === m.sender) {
      return send({ chat: m.chat, text: t('kick_only_group', lang) });
    }
    // WhatsApp: mentionedJid bevorzugen, sonst Argument
    let toKick = [];
    if (m.platform === 'whatsapp') {
      if (m.msgRaw?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        toKick = m.msgRaw.message.extendedTextMessage.contextInfo.mentionedJid;
      } else if (m.mentionedJid) {
        if (Array.isArray(m.mentionedJid)) {
          toKick = m.mentionedJid;
        } else if (typeof m.mentionedJid === 'string') {
          toKick = [m.mentionedJid];
        }
      } else if (args[0]) {
        toKick = [args[0]];
      }
    } else if (args[0]) {
      toKick = [args[0]];
    }
    if (!toKick || !toKick.length || !toKick[0]) {
      return send({ chat: m.chat, text: t('kick_no_user', lang) });
    }
    // Bot-Admin-Check
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) {
      return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    }
    // User-Admin-Check (optional: nur Admins dürfen kicken)
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) {
      return send({ chat: m.chat, text: t('kick_not_admin', lang) });
    }
    // Plattform-spezifisch
    if (m.platform === 'discord') {
      try {
        const guild = await platformApi.guilds.fetch(m.guildId);
        const memberId = toKick[0].replace(/[^0-9]/g, '');
        const member = await guild.members.fetch(memberId);
        await member.kick();
        return send({ chat: m.chat, text: t('kick_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('kick_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.kickChatMember(m.chat, toKick[0].replace(/[^0-9]/g, ''));
        return send({ chat: m.chat, text: t('kick_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('kick_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.groupParticipantsUpdate) {
          await platformApi.groupParticipantsUpdate(m.chat, toKick, 'remove');
          return send({ chat: m.chat, text: t('kick_success', lang) });
        } else {
          return send({ chat: m.chat, text: t('kick_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('kick_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('kick_not_supported', lang) });
    }
  }
};
