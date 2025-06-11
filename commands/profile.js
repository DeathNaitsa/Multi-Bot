const fs = require('fs');
const path = require('path');
const { findByPlatform, saveUser, decrypt } = require('../db/users');
const { getProfilePic, getUserStatus } = require('../mediaHelper');
const https = require('https'); // Am Anfang ergänzen

const profilePicPath = './media/profilepics';
if (!fs.existsSync(profilePicPath)) fs.mkdirSync(profilePicPath);

const aliases = {
  name: 'name', vorname: 'name',
  zweitname: 'middleName',
  nachname: 'lastName', nach: 'lastName',
  region: 'region', ort: 'region',
  geschlecht: 'gender', gender: 'gender',
  pronomen: 'pronouns',
  hobby: 'hobbies', hobbys: 'hobbies'
};

function formatNumber(num) {
  return Math.trunc(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function formatTime(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days} Tag${days !== 1 ? 'e' : ''}, ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
}
function getAge(birthday) {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age--;
  return age;
}
function getDaysUntilBirthday(birthday) {
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
}

// Plattformunabhängig: Privat-Chat-Erkennung
function isPrivateChat(platform, chatId, senderId) {
  return chatId === senderId;
}

module.exports = {
  name: 'me',
  aliases: ['meinprofil', 'profil', 'ich'],
  description: 'Zeigt und bearbeitet dein Profil (Name, Geburtstag, Bild, etc.)',

  async execute({ args, m, send, platformApi }) {
    const platform = m.platform;
    const platformId = m.sender;
    const chatId = m.chat;

    // User laden
    let user = await findByPlatform(platform, platformId);
    if (!user) {
      return send({ chat: chatId, text: '❌ Du bist noch nicht registriert. Mit `!reg Name.Alter` registrieren.' });
    }

    // === !me info ===
    if (/^info$/i.test(args[0])) {
      return send({
        chat: chatId,
        text: `🧾 *ME-Profil – Dein persönlicher Steckbrief*

📌 Du kannst folgende Befehle verwenden:
🧑 Vorname: *!me name Max*
👤 Zweitname: *!me zweitname Lukas*
👨 Nachname: *!me nachname Schmidt*
🎂 Geburtstag: *!me geb 18.05.2007*
🌍 Region: *!me region Wien*
🚻 Geschlecht: *!me geschlecht Männlich*
💬 Pronomen: *!me pronomen er/ihm*
🎯 Hobbys: *!me hobbys Lesen, Zeichnen, Gaming*
🗑️ Bild löschen: *!me bild delete*
❌ Löschen: *!me delete name*, *!me delete all*
🖼️ Profilbild setzen: *!me bild* (Bild mitsenden)`
      });
    }

    // === Bild setzen ===
  if (/^bild$/i.test(args[0]) && !args[1]) {
      if (m.image) {
        const fileName = path.join(profilePicPath, `${user.serialNumber}.jpg`);
        if (platform === 'discord' && typeof m.image === 'string' && m.image.startsWith('http')) {
          // Bild von Discord-URL herunterladen und speichern
          const file = fs.createWriteStream(fileName);
          https.get(m.image, response => {
            response.pipe(file);
            file.on('finish', async () => {
              file.close();
              user.profileImagePath = fileName;
              await saveUser(user);
              return send({ chat: chatId, text: '✅ Profilbild gespeichert.' });
            });
          }).on('error', err => {
            fs.unlinkSync(fileName);
            return send({ chat: chatId, text: '❌ Fehler beim Herunterladen des Bildes.' });
          });
          return; // Verhindert doppeltes Senden
        } else {
          // WhatsApp/Telegram: Buffer oder bereits lokal
          fs.writeFileSync(fileName, m.image);
          user.profileImagePath = fileName;
          await saveUser(user);
          return send({ chat: chatId, text: '✅ Profilbild gespeichert.' });
        }
      } else {
        return send({ chat: chatId, text: '❌ Bitte sende ein Bild mit.' });
      }
    }

    // === Bild löschen ===
    if (/^bild$/i.test(args[0]) && /^(delete|del|löschen)$/i.test(args[1])) {
      const fileName = path.join(profilePicPath, `${user.serialNumber}_${platform}.jpg`);
      if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
        delete user.profileImagePath;
        await saveUser(user);
        return send({ chat: chatId, text: '🗑️ Profilbild wurde gelöscht.' });
      } else {
        return send({ chat: chatId, text: '⚠️ Du hast kein gespeichertes Profilbild.' });
      }
    }

    // === Einzelfeld löschen oder alles löschen ===
    if (/^(delete|del|löschen|reset)$/i.test(args[0]) && args[1]) {
      const delKey = args[1]?.toLowerCase();
      if (delKey === 'all') {
        const keys = ['name','middleName','lastName','region','gender','pronouns','hobbies','birthday','birthdaySetAt','age','profileImagePath'];
        for (const k of keys) delete user[k];
        const fileName = path.join(profilePicPath, `${user.serialNumber}_${platform}.jpg`);
        if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
        await saveUser(user);
        return send({ chat: chatId, text: '🧹 Alle Profilinformationen wurden gelöscht.' });
      }
      const deleteKey = aliases[delKey] || delKey;
      if (user[deleteKey]) {
        delete user[deleteKey];
        await saveUser(user);
        return send({ chat: chatId, text: `🗑️ *${deleteKey}* wurde gelöscht.` });
      } else {
        return send({ chat: chatId, text: '⚠️ Nichts zum Löschen gefunden.' });
      }
    }

    // === Geburtstag setzen ===
    if (/^(geb|geburtstag|birthday)$/i.test(args[0]) && args[1]) {
      const dateStr = args.slice(1).join(' ').replace(/[-/]/g, '.').trim();
      const match = dateStr.match(/^(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})$/);
      if (!match) return send({ chat: chatId, text: '❌ Format: *TT.MM.JJJJ* z. B. `18.05.2007`' });
      const [_, d, mth, y] = match.map(Number);
      const birthday = new Date(y, mth - 1, d);
      if (isNaN(birthday.getTime()) || birthday > new Date()) return send({ chat: chatId, text: '❌ Ungültiges Datum.' });

      const age = getAge(birthday);
      if (age < 5 || age > 120) return send({ chat: chatId, text: '❌ Dein Alter muss zwischen *5* und *120 Jahren* liegen.' });

      const cooldown = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (user.birthdaySetAt && now - user.birthdaySetAt < cooldown) {
        const verbleibend = formatTime(user.birthdaySetAt + cooldown - now);
        return send({ chat: chatId, text: `⏳ Du kannst deinen Geburtstag erst wieder in *${verbleibend}* ändern.` });
      }

      user.birthday = birthday.toISOString();
      user.birthdaySetAt = now;
      user.age = age;
      await saveUser(user);
      return send({ chat: chatId, text: `🎉 Geburtstag gespeichert: *${d}.${mth}.${y}*\n📅 Du bist jetzt ${age} Jahre alt.` });
    }

    // === Persönliche Felder setzen ===
    const field = aliases[args[0]?.toLowerCase()];
    if (field) {
      const value = args.slice(1).join(' ').trim();
      if (!value) return send({ chat: chatId, text: `❌ Bitte gib einen Wert für *${field}* an.` });
      user[field] = field === 'hobbies' ? value.split(',').map(h => h.trim()) : value;
      await saveUser(user);
      return send({ chat: chatId, text: `✅ ${field} gespeichert: *${value}*` });
    }

    // === Profil anzeigen ===
    // Admin-Status (nur in Gruppen)
    let isAdmin = false, roles = [];
    const isPrivate = isPrivateChat(platform, chatId, platformId);
    if (!isPrivate) {
      try {
        const status = await getUserStatus(platform, platformApi, chatId, platformId);
        isAdmin = status.isAdmin;
        roles = status.roles || [];
      } catch {}
    }

    // IDs entschlüsseln/anzeigen
    let whatsappList = Array.isArray(user.whatsappNumbers)
      ? user.whatsappNumbers.map(enc => {
          try { return decrypt(enc); } catch { return '[Fehler]'; }
        }).join('\n   - ')
      : '-';
    let telegramList = user.telegramId
      
    let discordList = user.discordId

    // Profilbild holen (lokal, sonst Standard)
    let profileImage = await getProfilePic(user.serialNumber, platform, platformApi, platformId);

    // Boosts anzeigen mit Restzeit
    const boosts = user.boosts || {};
    const boostList = [];
    for (const [boostKey, boost] of Object.entries(boosts)) {
      if (!boost || !boost.active || Date.now() > boost.expiresAt) continue;
      const timeLeft = boost.expiresAt - Date.now();
      const timeString = `${Math.floor(timeLeft / 3600000)}h ${Math.floor((timeLeft % 3600000) / 60000)}m`;
      const boostLabel = {
        work: '🛠️ Work-Boost',
        rob: '💣 Rob-Boost',
        crash: '📉 Crash-Boost',
        slots: '🎰 Slots-Boost',
        wheel: '🎡 Wheel-Boost',
        daily: '📆 Daily-Boost',
        keno: '🎲 Keno-Boost',
        plinko: '🔻 Plinko-Boost'
      }[boostKey] || `🚀 Boost: ${boostKey}`;
      boostList.push(`${boostLabel} – *${timeString}*`);
    }

    // Persönliche Felder
    let personal = [
      `👤 *Persönliche Infos*`,
      user.name && `🧑 Vorname: ${user.name}`,
      user.middleName && `👤 Zweitname: ${user.middleName}`,
      user.lastName && `👨 Nachname: ${user.lastName}`,
      user.region && `🌍 Region: ${user.region}`,
      user.gender && `🚻 Geschlecht: ${user.gender}`,
      user.pronouns && `💬 Pronomen: ${user.pronouns}`,
      user.hobbies?.length && `🎯 Hobbys: ${user.hobbies.join(', ')}`,
      user.birthday && (() => {
        const bday = new Date(user.birthday);
        const age = getAge(bday);
        const days = getDaysUntilBirthday(bday);
        return [
          `🎂 Alter: ${age} Jahre`,
          days === 0 ? '🎉 Heute ist dein Geburtstag!' : `📅 Geburtstag in ${days} Tag${days !== 1 ? 'en' : ''}`
        ];
      })()
    ].flat().filter(Boolean);

    // Bot-/Systeminfos
    let botinfo = [
      `\n🤖 *Bot-Informationen*`,
      isAdmin ? '⚙️ *Admin der Gruppe* ✅' : '',
      (Array.isArray(user.roles) && user.roles.length) ? `• Rollen (DB): ${user.roles.map(r => `\`${r}\``).join(', ')}` : '',
      (roles && roles.length) ? `• Plattform-Rollen: ${roles.map(r => `\`${r}\``).join(', ')}` : '',
      `• Status: ${user.deleted ? 'Gelöscht' : 'Aktiv'}`,
      `📊 Level: ${user.level || 0} (${formatNumber(user.xp) || 0} XP)`,
      `👑 Premium: ${user.premium ? '✅' : '❌'}`,
      `💵 Kontostand: ${formatNumber(user.money) || 0} $`,
      boostList.length > 0 ? '\n⚡ *Aktive Boosts:*' : '',
      ...boostList,
      `• IDs:\n   - WhatsApp: ${whatsappList}\n   - Telegram: ${telegramList}\n   - Discord: ${discordList}`,
      isPrivate ? `• Save-Key: \`${user.saveKey || '-'}\`` : ''
    ].filter(Boolean);

    // Sende das Profil mit Bild (wenn vorhanden)
    await send({
      chat: chatId,
      text: [...personal, '', ...botinfo].join('\n'),
      image: profileImage
    });
  }
};