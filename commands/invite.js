// commands/invite.js
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');
module.exports = {
  name: 'invite',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    return t('invite_description', 'de') + '\n' + t('invite_description', 'en');
  },
  async execute({ m, send, platformApi }) {
    if (!m.chat || m.chat === m.sender) {
      let lang = 'de';
      try {
        const chat = await loadChatById(m.chat);
        if (chat && chat.language) lang = chat.language;
      } catch {}
      return send({ chat: m.chat, text: t('invite_only_group', lang) });
    }
    if (m.platform === 'discord') {
      try {
        const channel = await platformApi.channels.fetch(m.chat);
        const invite = await channel.createInvite({ maxAge: 3600, maxUses: 1 });
        return send({ chat: m.chat, text: t('invite_link', (await loadChatById(m.chat))?.language || 'de', { url: invite.url }) });
      } catch (e) {
        return send({ chat: m.chat, text: t('invite_error', (await loadChatById(m.chat))?.language || 'de', { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        const link = await platformApi.exportChatInviteLink(m.chat);
        return send({ chat: m.chat, text: t('invite_link', (await loadChatById(m.chat))?.language || 'de', { url: link }) });
      } catch (e) {
        return send({ chat: m.chat, text: t('invite_error', (await loadChatById(m.chat))?.language || 'de', { error: e.message }) });
      }
    } else {
      let lang = 'de';
      try {
        const chat = await loadChatById(m.chat);
        if (chat && chat.language) lang = chat.language;
      } catch {}
      return send({ chat: m.chat, text: t('invite_not_supported', lang) });
    }
  }
};
