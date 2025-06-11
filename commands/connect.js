const {
  findByPlatform,
  findBySerialNumber,
  decrypt
} = require('../db/users');
const { createSendFunction } = require('../send');

module.exports = {
  name: 'connect',
  aliases: ['verbinden'],
  description: 'Plattformübergreifende Registrierung: !connect <MasterSN>',

  async execute({ args, m, send }) {
    const platform = m.platform;
    const senderId = m.sender;

    // 1) Das Kind (Child-User) ermitteln
    const childUser = await findByPlatform(platform, senderId);
    if (!childUser) {
      return send({
        chat: m.chat,
        text: 'Du bist nicht registriert. Bitte zuerst `!reg Name.Alter` nutzen.'
      });
    }

    // 2) Master-SN aus den Argumenten lesen
    const masterSN = (args[0] || '').toUpperCase();
    if (!masterSN) {
      return send({
        chat: m.chat,
        text: 'Bitte gib die Seriennummer des Master-Accounts an: `!connect <MasterSN>`'
      });
    }

    // 3) Master-User anhand SN suchen
    const masterUser = await findBySerialNumber(masterSN);
    if (!masterUser) {
      return send({
        chat: m.chat,
        text: `Es existiert kein User mit der Seriennummer ${masterSN}.`
      });
    }

    // 4) Sicherstellen, dass ChildSN ≠ MasterSN
    if (childUser.serialNumber === masterUser.serialNumber) {
      return send({
        chat: m.chat,
        text: 'Du kannst dich nicht mit dir selbst verbinden.'
      });
    }

    // 5) Ermitteln, auf welcher Plattform der Master registriert ist
    let targetPlatform = null;
    let targetId = null;

    if (Array.isArray(masterUser.whatsappNumbers) && masterUser.whatsappNumbers.length > 0) {
      try {
        targetPlatform = 'whatsapp';
        targetId = decrypt(masterUser.whatsappNumbers[0]);
      } catch (e) {
        console.error('Kann WhatsApp-Nummer des Masters nicht entschlüsseln:', e);
        return send({
          chat: m.chat,
          text: 'Fehler beim Zugriff auf die WhatsApp-Nummer des Master-Accounts.'
        });
      }
    } else if (masterUser.telegramId) {
      targetPlatform = 'telegram';
      targetId = masterUser.telegramId;
    } else if (masterUser.discordId) {
      targetPlatform = 'discord';
      targetId = masterUser.discordId;
    } else {
      return send({
        chat: m.chat,
        text: 'Der Master-Account ist zwar in der DB, aber auf keiner Plattform aktiv (WhatsApp/Telegram/Discord).'
      });
    }

    // 6) Erzeuge eine send-Funktion für die Zielplattform
    let connTarget, sendTarget;
    switch (targetPlatform) {
      case 'whatsapp':
        connTarget = global.connWA;
        break;
      case 'telegram':
        connTarget = global.botTelegram;
        break;
      case 'discord':
        connTarget = global.discordClient;
        break;
    }
    try {
      sendTarget = createSendFunction(targetPlatform, connTarget);
    } catch (e) {
      console.error('Fehler beim Erzeugen der Send-Funktion:', e);
      return send({
        chat: m.chat,
        text: 'Fehler: konnte keine Send-Funktion für die Plattform des Masters erstellen.'
      });
    }

    // 7) Text-Nachricht für den Master formulieren
    const childSN = childUser.serialNumber;
    const childName = childUser.accounts?.[0]?.name || 'unbekannter Benutzer';

    const requestText =
      `🔗 *Verbindungsanfrage*\n` +
      `User \`${childName}\` (SN: ${childSN}) möchte die Konten verknüpfen.\n\n` +
      `Wenn du zustimmst, führe bitte:\n` +
      `*!verify ${childSN}*\n` +
      `aus, um die Verknüpfung abzuschließen.`;

    // 8) Anfrage an den Master senden
    try {
      await sendTarget({ chat: targetId, text: requestText });
    } catch (e) {
      console.error('Fehler beim Senden an Master:', e);
      return send({
        chat: m.chat,
        text: `Konnte Master auf seiner Plattform nicht erreichen.`
      });
    }

    // 9) Rückmeldung an das Child
    return send({
      chat: m.chat,
      text: `Verifizierungsanfrage an Master ${masterSN} gesendet.`
    });
  }
};