// commands/toggleevent.js
// Command zum Aktivieren/Deaktivieren von Gruppen-Events (welcome, leave, promote, kick, ...)
// Nutzung: !toggleevent <event> <on|off>
// Aliase: welcome, welk, willkommen, greet, join, leave, bye, promote, demote, kick, ban, etc.

const { isUserAdmin } = require('../utils/groupfunctions');
const { loadChatById, saveChat } = require('../db/chats');
const { t } = require('../utils/i18n');

// Erlaubte Events als Commandnamen
const allowedEvents = ['welcome', 'leave', 'promote', 'kick'];
const allowedStates = ['on', 'an', 'enable', '1', 'off', 'aus', 'disable', '0'];



module.exports = 
  // Ein Command für alle Events und States
  {
    name: 'toggleevent',
    aliases: ['event', 'eventon', 'eventoff', 'an', 'aus', ...allowedEvents, ...allowedStates],
    get description() {
      return t('toggleevent_description', 'de');
    },
    usage: '<event> <on|off> oder <on|off> <event>',
    async execute({ m, args, send, platformApi, command : commandName }) {
      const chat = await loadChatById(m.chat);
      const lang = chat?.language || 'de';
      const isGroup = m.chat && (m.chat.endsWith('@g.us') || m.chat.endsWith('@group') || m.chat.endsWith('@s.whatsapp.net') || m.chat.endsWith('-group') || m.chat.endsWith('@broadcast'));
      if (!isGroup) return send({ chat: m.chat, text: t('not_group', lang) });
      const userIsAdmin = await isUserAdmin(m, m.sender, platformApi);
      if (!userIsAdmin) return send({ chat: m.chat, text: t('not_admin', lang) });
      const { event, state } = parseEventAndState(args, commandName);
      if (!event || !state) return send({ chat: m.chat, text: t('toggleevent_usage', lang) });
      const enabled = ['on', 'an', 'enable', '1'].includes(state);
      let chatData = chat || {};
      if (typeof chatData[event] === 'boolean' && chatData[event] === enabled) {
        return send({ chat: m.chat, text: t(enabled ? 'event_already_enabled' : 'event_already_disabled', lang, { event }) });
      }
      chatData[event] = enabled;
      await saveChat(m.chat, chatData);
      send({ chat: m.chat, text: t(enabled ? 'event_enabled' : 'event_disabled', lang, { event }) });
    }
  }

function parseEventAndState(args, commandName) {
  // Erlaubt: !welcome on, !on welcome, !off welcome, !welcome off
  let event = null, state = null;
  if (args.length === 1) {
    // !welcome on
    event = commandName;
    state = args[0].toLowerCase();
  } else if (args.length === 2) {
    // !on welcome
    if (allowedStates.includes(args[0].toLowerCase())) {
      state = args[0].toLowerCase();
      event = args[1].toLowerCase();
    } else if (allowedStates.includes(args[1].toLowerCase())) {
      event = args[0].toLowerCase();
      state = args[1].toLowerCase();
    }
  }
  if (!allowedEvents.includes(event) || !allowedStates.includes(state)) return {};
  return { event, state };
}