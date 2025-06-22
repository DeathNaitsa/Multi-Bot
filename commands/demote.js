// commands/demote.js
// Plattformübergreifender Demote-Command für Gruppen
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'demote',
  get description() {
    // Dynamische Beschreibung je nach Chat-Sprache (m.chat ist immer vorhanden)
    return async function(m) {
      const chatDb = await loadChatById(m.chat);
      const lang = (chatDb && chatDb.sprache) || 'de';
      return t('demote_description', lang);
    };
  },
  async execute({ m, args, send, platformApi }) {
    // Sprache aus Chat-DB laden
    const chatDb = await loadChatById(m.chat);
    const lang = (chatDb && chatDb.sprache) || 'de';
    if (!m.chat || m.chat === m.sender) {
      return send({ chat: m.chat, text: t('demote_not_group', lang) });
    }
    let toDemote = null;
    if (m.platform === 'whatsapp') {
      if (m.msgRaw?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        toDemote = m.msgRaw.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (m.mentionedJid) {
        if (Array.isArray(m.mentionedJid)) {
          toDemote = m.mentionedJid[0];
        } else if (typeof m.mentionedJid === 'string') {
          toDemote = m.mentionedJid;
        }
      } else {
        toDemote = args[0];
      }
    } else {
      toDemote = args[0];
    }
    if (!toDemote) {
      return send({ chat: m.chat, text: t('demote_no_user', lang) });
    }
    const botIsAdmin = await isBotAdmin(m, platformApi);
    if (!botIsAdmin) {
      return send({ chat: m.chat, text: t('demote_bot_not_admin', lang) });
    }
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    if (!userIsAdmin) {
      return send({ chat: m.chat, text: t('demote_not_admin', lang) });
    }
    if (m.platform === 'discord') {
      return send({ chat: m.chat, text: t('demote_not_supported_discord', lang) });
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.promoteChatMember(m.chat, toDemote, { can_change_info: false, can_delete_messages: false, can_invite_users: false, can_restrict_members: false, can_pin_messages: false, can_promote_members: false });
        return send({ chat: m.chat, text: t('demote_success', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('demote_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.groupParticipantsUpdate) {
          await platformApi.groupParticipantsUpdate(m.chat, [toDemote], 'demote');
          return send({ chat: m.chat, text: t('demote_success', lang) });
        } else {
          return send({ chat: m.chat, text: t('demote_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('demote_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('demote_not_supported', lang) });
    }
  }
};
