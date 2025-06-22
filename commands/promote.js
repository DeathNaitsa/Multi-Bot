// commands/promote.js
// Plattformübergreifender Promote-Command für Gruppen
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
const debug = require('../utils/debug').debug;

module.exports = {
  name: 'promote',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('promote_description', 'de') || 'Macht ein Mitglied zum Admin (sofern möglich und erlaubt).';
  },
  async execute({ m, args, send, platformApi }) {
    let lang = 'de';
    debug('promote called:', { sender: m.sender, chat: m.chat, platform: m.platform, args });
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    // Prüfe: Wenn m.chat === m.sender, ist es KEINE Gruppe
    debug('group check:', { sender: m.sender, chat: m.chat, platform: m.platform });
    if (!m.chat || m.chat === m.sender) {
      debug('not a group:', { sender: m.sender, chat: m.chat, platform: m.platform });
      return send({ chat: m.chat, text: t('not_group', lang) });
    }
    let toPromote = null;
    if (m.platform === 'whatsapp') {
      if (m.msgRaw?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        toPromote = m.msgRaw.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (m.mentionedJid) {
        if (Array.isArray(m.mentionedJid)) {
          toPromote = m.mentionedJid[0];
        } else if (typeof m.mentionedJid === 'string') {
          toPromote = m.mentionedJid;
        }
      } else {
        toPromote = args[0];
      }
    } else {
      toPromote = args[0];
    }
    debug('toPromote:', toPromote);
    if (!toPromote) {
      debug('no user to promote');
      return send({ chat: m.chat, text: t('promote_no_user', lang) });
    }
    // Admin-Check und Bot-Admin-Check NUR in Gruppen!
    const botIsAdmin = await isBotAdmin(m, platformApi);
    debug('botIsAdmin:', botIsAdmin);
    if (!botIsAdmin) {
      debug('bot is not admin');
      return send({ chat: m.chat, text: t('bot_not_admin', lang) });
    }
    const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
    debug('userIsAdmin:', userIsAdmin);
    if (!userIsAdmin) {
      debug('user is not admin:', m.sender, m.chat, m.platform);
      return send({ chat: m.chat, text: t('not_admin', lang) });
    }
    if (m.platform === 'discord') {
      try {
        // Discord: Rolle hinzufügen (z.B. aus args[1] oder Standardrolle)
        const guild = await platformApi.guilds.fetch(m.guildId);
        const memberId = toPromote.replace(/[^0-9]/g, '');
        const member = await guild.members.fetch(memberId);
        let roleName = args[1] || 'Admin'; // Standardrolle, falls nicht angegeben
        let role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          // Rolle existiert nicht, erstelle sie
          role = await guild.roles.create({ name: roleName, color: 'BLUE', reason: 'Bot Promote Command' });
        }
        await member.roles.add(role);
        return send({ chat: m.chat, text: t('promote_success_discord', lang, { role: role.name }) });
      } catch (e) {
        return send({ chat: m.chat, text: t('promote_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'telegram') {
      try {
        await platformApi.promoteChatMember(m.chat, toPromote, { can_change_info: true, can_delete_messages: true, can_invite_users: true, can_restrict_members: true, can_pin_messages: true, can_promote_members: true });
        return send({ chat: m.chat, text: t('promote_success_telegram', lang) });
      } catch (e) {
        return send({ chat: m.chat, text: t('promote_error', lang, { error: e.message }) });
      }
    } else if (m.platform === 'whatsapp') {
      try {
        if (platformApi.groupParticipantsUpdate) {
          await platformApi.groupParticipantsUpdate(m.chat, [toPromote], 'promote');
          return send({ chat: m.chat, text: t('promote_success_whatsapp', lang) });
        } else {
          return send({ chat: m.chat, text: t('promote_wa_not_available', lang) });
        }
      } catch (e) {
        return send({ chat: m.chat, text: t('promote_error', lang, { error: e.message }) });
      }
    } else {
      return send({ chat: m.chat, text: t('promote_not_supported', lang) });
    }
  }
};
