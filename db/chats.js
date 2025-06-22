// File: db/chats.js
// -----------------
// Version MIT AES-256-GCM-Verschlüsselung für alle Chat-JSONs
// Speichert jede Datei in db/chats/<chatId>.json als { iv, authTag, data }.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHATS_DIR = path.join(__dirname, 'chats');

// ────────────────────────────────────────────────────────────────────────────
// HILFSFUNKTIONEN FÜR AES-256-GCM-VER- UND ENTSCHLÜSSELUNG (wiederholen)
// ────────────────────────────────────────────────────────────────────────────

function getEncryptionKey() {
  const raw = 'ASNFZ4mrze8EjRWeJq98PS5vtGDts96cAxc1CkYk7L8='
 if (!raw) {
    throw new Error('Die Umgebungsvariable DB_ENCRYPTION_KEY ist nicht gesetzt.');
  }

  let key;

  // 1) Wenn es 64 Hex-Zeichen sind: dekodiere per hex → 32 Bytes
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  }
  // 2) Wenn es ein Base64-String (44 Zeichen, endet auf "=") ist: dekodiere per base64 → 32 Bytes
  else if (/^[A-Za-z0-9+/]{43}[A-Za-z0-9+/=]$/.test(raw) && raw.endsWith('=')) {
    key = Buffer.from(raw, 'base64');
  }
  // 3) Sonst nehmen wir es einfach als UTF-8-String (muss genau 32 Zeichen lang sein)
  else {
    key = Buffer.from(raw, 'utf-8');
  }

  if (key.length !== 32) {
    throw new Error('DB_ENCRYPTION_KEY muss genau 32 Bytes (256 Bit) lang sein.');
  }
  return key;
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decrypt(encObj) {
  const key = getEncryptionKey();
  const iv = Buffer.from(encObj.iv, 'base64');
  const authTag = Buffer.from(encObj.authTag, 'base64');
  const data = Buffer.from(encObj.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
// ────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(CHATS_DIR)) {
  fs.mkdirSync(CHATS_DIR, { recursive: true });
}

// 1. Lade Chat-Daten für eine gegebene Chat-ID (bspw. WhatsApp-ChatID).
async function loadChatById(chatId) {
  const fullPath = path.join(CHATS_DIR, `${chatId}.json`);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const encObj = JSON.parse(raw);
    const plaintext = decrypt(encObj);
    return JSON.parse(plaintext);
  } catch (e) {
    console.error(`Fehler beim Einlesen/Entschlüsseln von Chat ${chatId}:`, e);
    return null;
  }
}

// 2. Speichere (überschreibe) Chat-Daten als verschlüsseltes JSON
async function saveChat(chatId, chatData) {
  const fullPath = path.join(CHATS_DIR, `${chatId}.json`);
  const plaintext = JSON.stringify(chatData, null, 2);
  const encObj = encrypt(plaintext);
  fs.writeFileSync(fullPath, JSON.stringify(encObj, null, 2), 'utf-8');
}

// 3. Lösche Chat (Datei komplett entfernen)
async function deleteChatById(chatId) {
  const fullPath = path.join(CHATS_DIR, `${chatId}.json`);
  if (!fs.existsSync(fullPath)) return false;
  fs.unlinkSync(fullPath);
  return true;
}

// 4. Liste alle vorhandenen Chat-IDs auf (Dateinamen ohne .json)
async function listAllChats() {
  const files = fs.readdirSync(CHATS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => f.replace('.json', ''));
}

module.exports = {
  loadChatById,
  saveChat,
  deleteChatById,
  listAllChats
};
