// File: db/users.js
// -----------------
// Enthält alle Funktionen, um User-Objekte zu laden, zu erstellen, zu speichern,
// zu verschlüsseln/entschlüsseln und zu löschen.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chain } = require('lodash'); // oder eine ähnliche Utility, falls du es nutzt
const { generateSaveKey } = require('../utils/saveKey'); // Importiere die Funktion zum Generieren des SaveKeys
const USERS_DIR = path.join(__dirname, 'users');

// ────────────────────────────────────────────────────────────────────────────
// 1) Hilfsfunktion: Key aus Umgebungsvariable holen (AES-256-GCM)
// ────────────────────────────────────────────────────────────────────────────
function getEncryptionKey() {
  const raw = process.env.DB_ENCRYPTION_KEY || 'ASNFZ4mrze8EjRWeJq98PS5vtGDts96cAxc1CkYk7L8=';
  if (!raw) {
    throw new Error('Die Umgebungsvariable DB_ENCRYPTION_KEY ist nicht gesetzt.');
  }

  let key;
  // Erkenne, ob es ein 64-stelliger Hex-String ist
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  }
  // Erkenne Base64 (44 Zeichen, endet mit "=" oder "==")
  else if (/^[A-Za-z0-9+/]{43}[A-Za-z0-9+/=]$/.test(raw) && raw.endsWith('=')) {
    key = Buffer.from(raw, 'base64');
  }
  // Sonst: UTF-8-Passphrase (muss genau 32 Zeichen sein)
  else {
    key = Buffer.from(raw, 'utf-8');
  }

  if (key.length !== 32) {
    throw new Error('DB_ENCRYPTION_KEY muss genau 32 Bytes (256 Bit) lang sein.');
  }
  return key;
}

// ────────────────────────────────────────────────────────────────────────────
// 2) AES-256-GCM Verschlüsselung / Entschlüsselung
// ────────────────────────────────────────────────────────────────────────────
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
// 3) Low-Level: Dateien einlesen / speichern
// ────────────────────────────────────────────────────────────────────────────

// Stellt sicher, dass das Verzeichnis existiert
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

// Liest alle User-Dateien (entschlüsselt) ein und gibt ein Array von Objekten zurück
async function _loadAllUsers() {
  const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
  const result = [];
  for (const file of files) {
    try {
      const fullPath = path.join(USERS_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const encObj = JSON.parse(raw);
      const clearText = decrypt(encObj);
      const userObj = JSON.parse(clearText);
      result.push(userObj);
    } catch (e) {
      console.error(`Fehler beim Laden von ${file}:`, e);
    }
  }
  return result;
}

// Lädt einen einzelnen User nach interner ID (z.B. 1, 2, 3)
async function loadUserById(id) {
  const filePath = path.join(USERS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const encObj = JSON.parse(raw);
    const clearText = decrypt(encObj);
    return JSON.parse(clearText);
  } catch (e) {
    console.error(`Fehler beim Laden von User ${id}:`, e);
    return null;
  }
}

// Speichert ein User-Objekt: überschreibt oder erstellt die Datei <id>.json
async function saveUser(userObj) {
  const id = userObj.id;
  if (!id) throw new Error('Kann User nicht speichern: kein id-Feld vorhanden');
  const filePath = path.join(USERS_DIR, `${id}.json`);
  const jsonString = JSON.stringify(userObj);
  const encObj = encrypt(jsonString);
  fs.writeFileSync(filePath, JSON.stringify(encObj, null, 2), 'utf8');
}

// Löscht einen User (so dass die ID später wiederverwendet werden kann)
async function deleteUserById(id) {
  const filePath = path.join(USERS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// Hilfsfunktion: WhatsApp-ID normalisieren (Nummer ohne Suffix und Doppelpunkt)
function normalizeWhatsAppId(id) {
  if (!id) return '';
  let base = id.split(':')[0];
  base = base.replace(/@.*$/, '');
  return base;
}

// Sucht nach User anhand Plattform und platformId (z. B. WhatsApp, Telegram, Discord)
async function findByPlatform(platform, platformId, lid) {
  const all = await _loadAllUsers();
  for (const u of all) {
    if (u.deleted) continue;
    switch (platform) {
      case 'whatsapp':
        if (Array.isArray(u.whatsappNumbers)) {
          for (const enc of u.whatsappNumbers) {
            try {
              const dec = decrypt(enc);
              if (
                normalizeWhatsAppId(dec) === normalizeWhatsAppId(platformId) ||
                (lid && normalizeWhatsAppId(dec) === normalizeWhatsAppId(lid))
              ) return u;
            } catch {}
          }
        }
        break;
      case 'web':
        if (u.serialNumber === platformId) return u;
        break;
      case 'telegram':
        if (u.telegramId === platformId) return u;
        break;
      case 'discord':
        if (u.discordId === platformId) return u;
        break;
    }
  }
  return null;
}


// Sucht nach User anhand ihrer Seriennummer
async function findBySerialNumber(serial) {
  const all = await _loadAllUsers();
  return all.find((u) => !u.deleted && u.serialNumber === serial) || null;
}

// Erstellt einen neuen User oder gibt einen existierenden zurück,
// basierend auf der Plattform und der platformId.
// Wenn neu, wird er intern die nächste freie ID zugewiesen.
async function createOrReuseUser(platform, platformId, initialFields = {}, lid = null) {
  // 1) Prüfe, ob es schon einen User mit dieser Plattform+ID gibt
  const existing = await findByPlatform(platform, platformId, lid);
  if (existing) return existing;

  // 2) Falls nicht, bestimme die nächste freie ID
  const all = await _loadAllUsers();
  const usedIds = all.map((u) => u.id);
  let newId = 1;
  while (usedIds.includes(newId)) {
    newId++;
  }

  // 3) Erzeuge eine neue Seriennummer (z. B. "M.00X")
  const serialNumber = `M.${String(newId).padStart(3, '0')}`;

  // 4) Baue das neue User-Objekt
  const timestamp = new Date().toISOString();
 const newUser = {
    id: newId,
    serialNumber,
    whatsappNumbers: platform === 'whatsapp' ? [encrypt(platformId)].concat(lid ? [encrypt(lid)] : []) : [],
    telegramId: platform === 'telegram' ? platformId : undefined,
    discordId: platform === 'discord' ? platformId : undefined,
    name: initialFields.name || '',
    birthdate: initialFields.birthdate || null,
    saveKey: generateSaveKey(),
    additionalData: {
      language: initialFields.language || 'de',
      registeredAt: timestamp,
      roles: initialFields.roles || []
    },
    accounts: [],
    warn: 0,
    timeout: -1,
    exp: 0,
    dolares: 20,
    premiumDate: -1,
    regTime: Date.now(),
    role: 'Novato',
    diamond: 3,
    health: 100,
    limit: 20,
    money: 500,
    seed: 5,
    team: 'user',
    teamm: 'user',
    premium: false,
    plant: '',
    xp: 1,
    banned: false,
    afk: -1,
    afkReason: '',
    marry: '',
    name: initialFields.name || '',
    email: '',
    label: 'Nutzer von Chisato',
    age: initialFields.age || 0,
    autoxpup: true,
    mo: false,
    di: false,
    mi: false,
    do: false,
    fr: false,
    sa: false,
    so: false,
    planted: false,
    spam: false,
    level: 0,
    deleted: false
  };

  // 5) Setze die Plattform-spezifische ID (v. a. verschlüsseln, falls WhatsApp)
  switch (platform) {
    case 'whatsapp':
      // Für WhatsApp verschlüsseln wir die Telefonnummer und ggf. lid
      newUser.whatsappNumber = encrypt(platformId);
      if (lid) newUser.whatsappLid = encrypt(lid);
      break;
    case 'telegram':
      newUser.telegramId = platformId;
      break;
    case 'discord':
      newUser.discordId = platformId;
      break;
  }

  // 6) Speichere den neuen User
  await saveUser(newUser);
  return newUser;
}
async function registerUserWithData(platform, platformId, oldUserData = {}, lid = null) {
  // Prüfen, ob User mit Plattform+ID schon existiert
  const existing = await findByPlatform(platform, platformId, lid);
  if (existing) return existing;

  // Nächste freie ID bestimmen
  const all = await _loadAllUsers();
  const usedIds = all.map(u => u.id);
  let newId = 1;
  while (usedIds.includes(newId)) newId++;

  const serialNumber = `M.${String(newId).padStart(3, '0')}`;
  const timestamp = new Date().toISOString();

 const userObj = {
    ...oldUserData,
    id: newId,
    serialNumber,
    whatsappNumbers: platform === 'whatsapp'
      ? [encrypt(platformId)].concat(lid && lid !== platformId ? [encrypt(lid)] : [])
      : (oldUserData.whatsappNumbers || []),
    telegramId: platform === 'telegram'
      ? platformId
      : (oldUserData.telegramId || undefined),
    discordId: platform === 'discord'
      ? platformId
      : (oldUserData.discordId || undefined),
    saveKey: oldUserData.saveKey || generateSaveKey(),
    additionalData: {
      language: oldUserData?.additionalData?.language || 'de',
      registeredAt: timestamp,
      roles: oldUserData?.additionalData?.roles || []
    },
    deleted: false
  };

  await saveUser(userObj);
  return userObj;
}
// ────────────────────────────────────────────────────────────────────────────
// 6) Export aller Funktionen
// ────────────────────────────────────────────────────────────────────────────
module.exports = {
  encrypt,
  decrypt,
  _loadAllUsers,
  loadUserById,
  saveUser,
  deleteUserById,
  registerUserWithData,
  findByPlatform,
  findBySerialNumber,
  createOrReuseUser
};
