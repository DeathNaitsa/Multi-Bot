// utils/i18n.js
// Einfache Übersetzungsfunktion für Chat- oder User-basierte Sprache
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../locales');
const loadedLocales = {};

function loadLocale(lang) {
  if (!loadedLocales[lang]) {
    const file = path.join(LOCALES_DIR, `${lang}.json`);
    if (fs.existsSync(file)) {
      loadedLocales[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      loadedLocales[lang] = {};
    }
  }
  return loadedLocales[lang];
}

function t(key, lang = 'de', params = {}) {
  const dict = loadLocale(lang) || {};
  let str = dict[key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return str;
}

module.exports = { t };
