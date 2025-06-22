// commands/seteventtext.js
// Command zum Anpassen der Event-Texte (welcome, leave, promote, kick, ...)
// Nutzung: !seteventtext <event> <text>
// Beispiel: !seteventtext welcome Willkommen {user} in {group}!

const fs = require('fs');
const path = require('path');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');
const { isBotAdmin, isUserAdmin } = require('../utils/groupfunctions');

module.exports = {
    name: 'seteventtext',
    description: '', // Dynamisch, siehe Getter unten
    get description() {
        // Dynamische Beschreibung je nach Sprache
        // Fallback: Deutsch
        return t('seteventtext_description', 'de') || 'Setzt den Text für ein Gruppen-Event (welcome, leave, promote, kick, ...)';
    },
    usage: '<event> <text>',
    admin: true,
    async execute({ m, args, send, platformApi }) {
        let lang = 'de';
        try {
            const chat = await loadChatById(m.chat);
            if (chat && chat.language) lang = chat.language;
        } catch {}
        if (!m.chat || m.chat === m.sender) return send({ chat: m.chat, text: t('not_group', lang) });
        const botIsAdmin = await isBotAdmin(m, platformApi);
        if (!botIsAdmin) return send({ chat: m.chat, text: t('bot_not_admin', lang) });
        const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
        if (!userIsAdmin) return send({ chat: m.chat, text: t('not_admin', lang) });
        const [event, ...textArr] = args;
        if (!event || textArr.length === 0) return send({ chat: m.chat, text: t('seteventtext_usage', lang) });
        const validEvents = ['welcome', 'leave', 'promote', 'kick'];
        if (!validEvents.includes(event)) return send({ chat: m.chat, text: t('seteventtext_invalid', lang, { events: validEvents.join(', ') }) });
        const text = textArr.join(' ');
        const filePath = path.join(__dirname, '../db/chats', `${m.chat}.json`);
        let chat = {};
        if (fs.existsSync(filePath)) {
            chat = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        chat[event + 'Text'] = text;
        fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
        send({ chat: m.chat, text: t('seteventtext_success', lang, { event, text }) });
    }
};
