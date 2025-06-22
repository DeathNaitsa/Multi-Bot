// utils/groupfunctions.js
// Plattformübergreifende Gruppenfunktionen für Discord, Telegram, WhatsApp

module.exports = {
  // Mitgliederliste holen
  async getGroupMembers(m, platformApi) {
    if (m.platform === 'discord') {
      const guild = await platformApi.guilds.fetch(m.guildId);
      const members = await guild.members.fetch();
      return Array.from(members.values()).map(u => ({ id: u.id, username: u.user.username, isAdmin: u.permissions.has('Administrator') }));
    } else if (m.platform === 'telegram') {
      // Telegram: API-Limit, nur Admins können alle sehen
      try {
        const admins = await platformApi.getChatAdministrators(m.chat);
        const adminIds = admins.map(a => a.user.id.toString());
        // Telegram gibt keine vollständige Mitgliederliste, nur Admins
        return admins.map(a => ({ id: a.user.id.toString(), username: a.user.username, isAdmin: true }));
      } catch {
        return [];
      }
    } else if (m.platform === 'whatsapp') {
      // WhatsApp: Mitgliederliste und Admins via groupMetadata
      try {
        if (platformApi.groupMetadata) {
          const meta = await platformApi.groupMetadata(m.chat);
          return meta.participants.map(p => ({
            id: normalizeWhatsAppId(p.id),
            username: normalizeWhatsAppId(p.id), // WhatsApp hat keinen Usernamen
            isAdmin: ['admin', 'superadmin'].includes(p.admin)
          }));
        }
        // Fallback: keine API
        return [];
      } catch {
        return [];
      }
    } else {
      return [];
    }
  },

  // Prüft, ob ein User Admin ist
  async isUserAdmin(m, userId, platformApi) {
    if (m.platform === 'discord') {
      const guild = await platformApi.guilds.fetch(m.guildId);
      const member = await guild.members.fetch(userId);
      return member.permissions.has('Administrator');
    } else if (m.platform === 'telegram') {
      const admins = await platformApi.getChatAdministrators(m.chat);
      return admins.some(a => a.user.id.toString() === userId.toString());
    } else if (m.platform === 'whatsapp') {
      // WhatsApp: Admin-Check via groupMetadata
      try {
        if (platformApi.groupMetadata) {
          const meta = await platformApi.groupMetadata(m.chat);
          const user = meta.participants.find(p => normalizeWhatsAppId(p.id) === normalizeWhatsAppId(userId));
          return user && ['admin', 'superadmin'].includes(user.admin);
        }
        return false;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  },

  // Prüft, ob der Bot selbst Admin ist
  async isBotAdmin(m, platformApi) {
    if (m.platform === 'discord') {
      const guild = await platformApi.guilds.fetch(m.guildId);
      const botId = platformApi.user.id;
      const member = await guild.members.fetch(botId);
      return member.permissions.has('Administrator');
    } else if (m.platform === 'telegram') {
      const me = await platformApi.getMe();
      const admins = await platformApi.getChatAdministrators(m.chat);
      return admins.some(a => a.user.id === me.id);
    } else if (m.platform === 'whatsapp') {
      // WhatsApp: Bot-Admin-Check via groupMetadata
      try {
        if (platformApi.groupMetadata && platformApi.user) {
          const meta = await platformApi.groupMetadata(m.chat);
          const botId = platformApi.user.id || platformApi.user.jid;
          const bot = meta.participants.find(p => normalizeWhatsAppId(p.id) === normalizeWhatsAppId(botId));
          return bot && ['admin', 'superadmin'].includes(bot.admin);
        }
        return false;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }
};

// WhatsApp-ID normalisieren (nur Nummer, kein Suffix, kein Doppelpunkt)
function normalizeWhatsAppId(id) {
  if (!id) return '';
  // Entferne alles nach dem Doppelpunkt (inklusive)
  let base = id.split(':')[0];
  // Entferne Suffix wie @s.whatsapp.net oder @lid
  base = base.replace(/@.*$/, '');
  return base;
}
