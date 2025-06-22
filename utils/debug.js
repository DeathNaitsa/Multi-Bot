// utils/debug.js
// Zentrales Logging- und Debug-Modul
// Debug-Modul: Aktivierung über Umgebungsvariable BIND_DEBUG

require('dotenv').config(); // .env-Variablen laden

const util = require('util');
const DEBUG_ENABLED = process.env.BINDE_DEBUG === '1' || process.env.BINDE_DEBUG === 'true';

const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

function log(level, ...args) {
  if (!DEBUG_ENABLED && level === LEVELS.DEBUG) return;
  const timestamp = new Date().toISOString();
  const msg = util.format(...args);
  // Hier könntest du z.B. auch in eine Datei schreiben
  console.log(`[${timestamp}] [${level}] ${msg}`);
}

module.exports = {
  debug: (...args) => log(LEVELS.DEBUG, ...args),
  info: (...args) => log(LEVELS.INFO, ...args),
  warn: (...args) => log(LEVELS.WARN, ...args),
  error: (...args) => log(LEVELS.ERROR, ...args),
};
