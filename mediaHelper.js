const fs = require('fs');
const path = require('path');

const PROFILE_PIC_DIR = path.join(__dirname, './media/profilepics');
if (!fs.existsSync(PROFILE_PIC_DIR)) fs.mkdirSync(PROFILE_PIC_DIR, { recursive: true });

function getProfilePicPath(serialNumber, platform) {
  return path.join(PROFILE_PIC_DIR, `${serialNumber}.jpg`);
}

function saveProfilePic(serialNumber, platform, buffer) {
  const filePath = getProfilePicPath(serialNumber, platform);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function deleteProfilePic(serialNumber, platform) {
  const filePath = getProfilePicPath(serialNumber, platform);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function getProfilePic(serialNumber, platform, platformApi, userId) {
  const filePath = getProfilePicPath(serialNumber, platform);
  if (fs.existsSync(filePath)) return filePath;

  let url = null;
  try {
    if (platform === 'whatsapp' && platformApi?.profilePictureUrl) {
      url = await platformApi.profilePictureUrl(userId, 'image');
    } else if (platform === 'telegram' && platformApi?.getUserProfilePhotos) {
      const photos = await platformApi.getUserProfilePhotos(userId, { limit: 1 });
      if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        url = await platformApi.getFileLink(fileId);
      }
    } else if (platform === 'discord' && platformApi?.users) {
      const user = await platformApi.users.fetch(userId);
      url = user.displayAvatarURL({ format: 'jpg', size: 512 });
    }
    if (url) {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.buffer();
        saveProfilePic(serialNumber, platform, buffer);
        return filePath;
      }
    }
  } catch (e) {
    // Optional: Logging
  }

  return path.join(__dirname, './media/default-profile.jpg');
}

/**
 * Plattformübergreifend prüfen, ob ein User Admin ist (und ggf. weitere Rechte)
 * @param {string} platform - 'whatsapp' | 'telegram' | 'discord'
 * @param {object} platformApi - Die jeweilige API-Instanz
 * @param {string} chatId - Die Chat-/Gruppen-ID
 * @param {string} userId - Die User-ID
 * @returns {Promise<{isAdmin: boolean, roles?: string[]}>}
 */
async function getUserStatus(platform, platformApi, chatId, userId) {
  // Privat-Chat-Erkennung
  const isPrivate =
    (platform === 'whatsapp' && !chatId.endsWith('@g.us')) ||
    (platform === 'telegram' && chatId === userId) ||
    (platform === 'discord' && chatId === userId);

  if (isPrivate) {
    return { isAdmin: false, roles: [] };
  }

  switch (platform) {
    case 'whatsapp':
      try {
        const meta = await platformApi.groupMetadata(chatId);
        const participant = meta.participants.find(p => p.id === userId);
        return { isAdmin: participant && ['admin', 'superadmin'].includes(participant.admin) };
      } catch {
        return { isAdmin: false };
      }
    case 'telegram':
      try {
        const member = await platformApi.getChatMember(chatId, userId);
        const isAdmin = ['administrator', 'creator'].includes(member.status);
        const roles = [member.status];
        return { isAdmin, roles };
      } catch {
        return { isAdmin: false, roles: [] };
      }
    case 'discord':
      try {
        const guild = await platformApi.guilds.fetch(chatId);
        const member = await guild.members.fetch(userId);
        const isAdmin = member.permissions.has('Administrator');
        const roles = member.roles.cache.map(r => r.name);
        return { isAdmin, roles };
      } catch {
        return { isAdmin: false, roles: [] };
      }
    default:
      return { isAdmin: false, roles: [] };
  }
}

module.exports = {
  getProfilePicPath,
  saveProfilePic,
  deleteProfilePic,
  getProfilePic,
  getUserStatus // <--- NEU!
};