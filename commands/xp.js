// File: commands/xp.js

const { findByPlatform } = require('../db/users');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'xp',
  aliases: ['experience'],
  get description() {
    return t('xp_description', 'de');
  },

  /**
   * Formatiert einen Bruch als Prozentzahl mit periodisch wiederkehrenden Nachkommastellen.
   * numerator / denominator entspricht bereits dem Prozentwert ohne /100.
   * Beispiel: 1/3 → "0.(3)%"
   */
  formatPercentRepeating(numerator, denominator, decimalPlaces = 20) {
    const intPart = Math.floor(numerator / denominator);
    let remainder = numerator % denominator;

    const remaindersMap = new Map();
    const digits = [];
    let repeatingStart = null;

    for (let i = 0; i < decimalPlaces; i++) {
      if (remainder === 0) break;
      if (remaindersMap.has(remainder)) {
        repeatingStart = remaindersMap.get(remainder);
        break;
      }
      remaindersMap.set(remainder, i);
      remainder *= 10;
      const digit = Math.floor(remainder / denominator);
      digits.push(digit);
      remainder %= denominator;
    }

    let fracPart;
    if (repeatingStart !== null) {
      const nonRepeat = digits.slice(0, repeatingStart).join('');
      const repeat = digits.slice(repeatingStart).join('');
      fracPart = `${nonRepeat}(${repeat})`;
    } else {
      fracPart = digits.join('').padEnd(decimalPlaces, '0');
    }

    return `${intPart}.${fracPart}%`;
  },

  /**
   * Formatiert eine Zahl mit deutschen Tausenderpunkten.
   * Beispiel: 1234567 → "1.234.567"
   */
  formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  },

  /**
   * Berechnet den XP-Fortschritt eines Users:
   * - xpNeededForNextLevel: Wie viele XP fehlen bis zum nächsten Level.
   * - maxXpForNextLevel: Die Gesamt-XP, die für dieses Level benötigt werden.
   *
   * Die Schwelle variiert je nach Level (linear steigend + kleine Variation).
   * Basis: 100 + 10*(level−1) + Variation (−15…+15 anhand level*7 % 31 − 15).
   */
  checkXpProgress(user) {
    const level = user.level || 1;
    const currentExp = Math.round(user.exp || 0);

    const baseThreshold = 100;
    const linearIncrease = 10 * (level - 1);
    const variation = ((level * 7) % 31) - 15; // Werte −15…+15
    const xpThreshold = baseThreshold + linearIncrease + variation;

    const xpNeeded = Math.max(xpThreshold - currentExp, 0);
    return {
      xpNeededForNextLevel: xpNeeded,
      maxXpForNextLevel: xpThreshold,
      currentExp: currentExp
    };
  },

  /**
   * Wird ausgeführt, wenn jemand "/xp" oder "!xp" eintippt.
   * Zeigt den XP-Status des Absenders an.
   */
  async execute({ m, send, args }) {
    const platform = m.platform;
    const platformId = m.sender;
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';

    // 1) Hol den User-Datensatz
    const user = await findByPlatform(platform, platformId);
    if (!user) {
      return send({ chat: m.chat, text: t('not_registered', lang) });
    }

    // 2) Falls Felder fehlen, sichere Default-Werte
    user.exp = Math.round(user.exp || 0);
    user.level = user.level || 1;
    user.role = user.role || t('xp_role_unknown', lang);

    // 3) Berechne Fortschritt
    const progress = this.checkXpProgress(user);
    const currentXp = progress.currentExp;
    const maxXp = progress.maxXpForNextLevel;
    const xpNeeded = progress.xpNeededForNextLevel;

    // 4) Prozentwert (0 … 100) für Progress-Bar
    const percentNumber = Math.min(Math.max((currentXp / maxXp) * 100, 0), 100);

    // 5) Prozent als String mit periodischen Nachkommastellen
    const numerator = currentXp * 100;
    const denominator = maxXp;
    const percentStr = this.formatPercentRepeating(numerator, denominator, 20);

    // 6) Erstelle eine 20 Zeichen lange Progress-Bar
    const barLength = 20;
    const filledBars = Math.round((percentNumber / 100) * barLength);
    const cappedFilled = Math.min(Math.max(filledBars, 0), barLength);
    const emptyBarsCount = barLength - cappedFilled;
    const progressBar = '█'.repeat(cappedFilled) + '░'.repeat(emptyBarsCount);

    // 7) Baue die Antwort-Nachricht
    const message = t('xp_status', lang, {
      role: user.role,
      exp: this.formatNumber(user.exp),
      level: user.level,
      currentXp: this.formatNumber(currentXp),
      maxXp: this.formatNumber(maxXp),
      xpNeeded: this.formatNumber(xpNeeded),
      progressBar,
      percentStr
    });

    // 8) Sende die Nachricht
    return send({ chat: m.chat, text: message });
  }
};
