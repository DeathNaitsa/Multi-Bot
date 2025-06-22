// utils/groupEvents.js
// Zentrale Event-Logging-Logik für Gruppenereignisse (join, leave, promote, kick, ...)
// Nutzt anpassbare Texte aus der Chat-Konfiguration (z.B. chat.welcomeText)
// Platzhalter: {user}, {group}, {admin}, {date}, {desc}, ...

const fs = require('fs');
const path = require('path');

// Hilfsfunktion: Chat-Konfiguration laden (z.B. aus db/chats/<chatId>.json)
function loadChatConfig(chatId) {
    try {
        const filePath = path.join(__dirname, '../db/chats', `${chatId}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.error('Fehler beim Laden der Chat-Konfiguration:', e);
    }
    return {};
}

// Platzhalter im Text ersetzen
function formatEventText(template, data) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
}

/**
 * Event-Logger für Gruppenereignisse
 * Prüft jetzt auch, ob das Event aktiviert ist (z.B. welcomeEnabled)
 * @param {string} eventType - z.B. 'welcome', 'leave', 'promote', 'kick'
 * @param {string} chatId - Gruppen-ID
 * @param {object} data - Platzhalter-Daten (user, admin, group, ...)
 * @param {function} sendMessage - Funktion zum Senden der Nachricht (msg, [optionen])
 */
function logGroupEvent(eventType, chatId, data, sendMessage) {
    const chat = loadChatConfig(chatId);
    let textKey = '';
    let enabledKey = '';
    let altKey = '';
    let defaultTexts = {
        welcome: 'Willkommen {user} in {group}! 🎉',
        leave: '{user} hat {group} verlassen.',
        promote: '{user} ist jetzt Admin in {group}.',
        kick: '{user} wurde aus {group} entfernt.'
    };
    switch (eventType) {
        case 'welcome': textKey = 'welcomeText'; enabledKey = 'welcomeEnabled'; altKey = 'welcome'; break;
        case 'leave': textKey = 'leaveText'; enabledKey = 'leaveEnabled'; altKey = 'leave'; break;
        case 'promote': textKey = 'promoteText'; enabledKey = 'promoteEnabled'; altKey = 'promote'; break;
        case 'kick': textKey = 'kickText'; enabledKey = 'kickEnabled'; altKey = 'kick'; break;
        default: return;
    }
    // Welcome/Leave: Event muss explizit aktiviert sein
    if (eventType === 'welcome' || eventType === 'leave') {
        if (!(chat[enabledKey] === true || chat[altKey] === true)) {
            console.log(`[GroupEvent] ${eventType} in ${chatId} nicht aktiviert (${enabledKey} und ${altKey} fehlen oder sind nicht true)`);
            return;
        }
    }
    // Promote/Kick: Immer aktiv
    let template = chat[textKey] || defaultTexts[eventType];
    if (!template) {
        console.log(`[GroupEvent] Kein Text für ${eventType} in ${chatId}, kein Standardtext gefunden.`);
        return;
    }
    const msg = formatEventText(template, data);
    console.log(`[GroupEvent] Event: ${eventType}, Chat: ${chatId}, Aktiviert: ${eventType === 'promote' || eventType === 'kick' ? true : (!!chat[enabledKey] || !!chat[altKey])}, Text: ${template}, Daten:`, data);
    if (msg && typeof sendMessage === 'function') {
        sendMessage(msg, data.options || {});
    }
}

module.exports = {
    logGroupEvent,
    formatEventText,
    loadChatConfig
};
