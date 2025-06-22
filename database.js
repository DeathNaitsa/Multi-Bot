#!/usr/bin/env node
// File: database.js
// -----------------
// Eine kleine CLI, um User (interne IDs) und Chats (echte Chat-IDs) anzusehen oder zu löschen.

// Importiere die Funktionen aus unseren DB-Modulen
const { _loadAllUsers, loadUserById, deleteUserById } = require('./db/users');
const { listAllChats, loadChatById, deleteChatById } = require('./db/chats');

// Lies alle Argumente nach "node database.js"
const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error(`
Usage:
  node database.js list users
  node database.js view user <id>
  node database.js delete user <id>
  node database.js list chats
  node database.js view chat <chatId>
  node database.js delete chat <chatId>
`);
  process.exit(1);
}

(async () => {
  const [cmd, type, maybeId] = argv;

  switch (`${cmd} ${type}`) {
    // ─────────────────────────────────────────────────────────────────────────────
    case 'list users': {
      const allUsers = await _loadAllUsers();
      if (allUsers.length === 0) {
        console.log('Keine User-Dateien gefunden.');
        return;
      }
      console.log('Alle User in db/users/:');
      allUsers
        .sort((a, b) => a.id - b.id)
        .forEach((u) => {
          console.log(
            `ID=${u.id.toString().padStart(3, '0')}  SN=${u.serialNumber || '<gelöscht>'}  ` +
            `Discord=${u.discordId || '-'}  WhatsApp=${u.whatsappNumber ? '[verschlüsselt]' : '-'}  ` +
            `Telegram=${u.telegramId || '-'}  deleted=${u.deleted ? 'ja' : 'nein'}`
          );
        });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    case 'view user': {
      if (!maybeId) {
        console.error('Bitte ID angeben: node database.js view user <id>');
        return;
      }
      const id = parseInt(maybeId, 10);
      if (isNaN(id)) {
        console.error('Ungültige ID.');
        return;
      }
      const u = await loadUserById(id);
      if (!u) {
        console.log(`User mit ID ${id} existiert nicht.`);
        return;
      }
      console.log(`Inhalt von db/users/${id}.json:\n`);
      console.log(JSON.stringify(u, null, 2));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    case 'delete user': {
      if (!maybeId) {
        console.error('Bitte ID angeben: node database.js delete user <id>');
        return;
      }
      const id = parseInt(maybeId, 10);
      if (isNaN(id)) {
        console.error('Ungültige ID.');
        return;
      }
      const success = await deleteUserById(id);
      if (success) {
        console.log(`User mit ID ${id} wurde als gelöscht markiert (Slot frei zur Wiederverwendung).`);
      } else {
        console.log(`User mit ID ${id} nicht gefunden.`);
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    case 'list chats': {
      const allChats = await listAllChats();
      if (allChats.length === 0) {
        console.log('Keine Chat-Dateien gefunden.');
        return;
      }
      console.log('Alle Chats in db/chats/:');
      allChats.forEach((chatId) => {
        console.log(`ChatID=${chatId}`);
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    case 'view chat': {
      if (!maybeId) {
        console.error('Bitte ChatID angeben: node database.js view chat <chatId>');
        return;
      }
      const chatId = maybeId;
      const chat = await loadChatById(chatId);
      if (!chat) {
        console.log(`Chat mit ID ${chatId} existiert nicht.`);
        return;
      }
      console.log(`Inhalt von db/chats/${chatId}.json:\n`);
      console.log(JSON.stringify(chat, null, 2));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    case 'delete chat': {
      if (!maybeId) {
        console.error('Bitte ChatID angeben: node database.js delete chat <chatId>');
        return;
      }
      const chatId = maybeId;
      const success = await deleteChatById(chatId);
      if (success) {
        console.log(`Chat mit ID ${chatId} wurde gelöscht.`);
      } else {
        console.log(`Chat mit ID ${chatId} nicht gefunden.`);
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    default:
      console.error('Unbekannter Befehl. Siehe Usage.');
      process.exit(1);
  }
})();
