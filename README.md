# Modular-Bot

Ein modularer, plattformübergreifender Bot für WhatsApp, Telegram und Discord mit dateibasierter User- und Chat-DB.

**Dieser Bot ist für jeden Benutzer frei verfügbar und nutzbar.**

## Features
- Multi-Plattform: WhatsApp, Telegram, Discord
- Modulares Command-System (einfach erweiterbar)
- Mehrsprachig (deutsch/englisch, dynamisch pro Chat)
- DSGVO-konforme Datenhaltung (lokale JSON-DB, verschlüsselt)
- Admin- und Gruppenfunktionen
- Medien- und Profilbildverwaltung
- Einfache Konfiguration über `.env`

## Installation
1. Repository klonen:
   ```sh
   git clone https://github.com/DeathNaitsa/Multi-Bot.git
   cd Multi-Bot
   ```
2. Abhängigkeiten installieren:
   ```sh
   npm install
   ```
   
   **Hinweis:** Falls bei der Installation Paket-Konflikte auftreten, verwenden Sie:
   ```sh
   npm install --force
   ```
   Dies behebt eventuelle Abhängigkeitskonflikte zwischen verschiedenen Paketen.
3. `.env` anlegen (siehe `.env.example`):
   ```sh
   cp .env.example .env
   # Trage deine Token und IDs ein
   ```

## Starten
```sh
npm start
```

## Entwicklung
```sh
npm run dev
```

## Bot-Nutzung

### Erste Schritte
1. **Bot-Registrierung**: Nutzer müssen sich zuerst mit dem Befehl `/register` registrieren
2. **Befehle verwenden**: Alle Befehle beginnen standardmäßig mit `/` (z.B. `/ping`, `/menu`)
   - Der Prefix kann in der `.env`-Datei angepasst werden (siehe Konfiguration)
3. **Hilfe anzeigen**: Verwenden Sie `/menu` oder `/help` für eine Liste aller Befehle

### Verfügbare Plattformen
- **WhatsApp**: QR-Code scannen beim ersten Start
- **Telegram**: Bot-Token in `.env` eintragen
- **Discord**: Bot-Token und Guild-ID in `.env` eintragen

### Wichtige Befehle
- `{PREFIX}register` - Registrierung im System
- `{PREFIX}menu` oder `{PREFIX}help` - Zeigt alle verfügbaren Befehle
- `{PREFIX}ping` - Testet Bot-Latenz
- `{PREFIX}profile` - Zeigt Benutzerprofil mit Level und XP
- `{PREFIX}sprache` - Ändert die Chat-Sprache (DE/EN)

*Hinweis: `{PREFIX}` steht für den konfigurierten Prefix (Standard: `/`)*

### Admin-Befehle (nur für Gruppen-Admins)
- `{PREFIX}promote` - Befördert einen Nutzer zum Admin
- `{PREFIX}demote` - Entfernt Admin-Rechte
- `{PREFIX}kick` - Entfernt Nutzer aus der Gruppe
- `{PREFIX}ban`/`{PREFIX}unban` - Sperrt/entsperrt Nutzer
- `{PREFIX}mute`/`{PREFIX}unmute` - Stumm schalten/entsperren

*Hinweis: `{PREFIX}` steht für den konfigurierten Prefix (Standard: `/`)*

## Entwicklung & Erweiterung

### Neue Commands erstellen

1. **Command-Struktur**: Erstellen Sie eine neue `.js`-Datei im `/commands`-Ordner:

```javascript
// commands/meincommand.js
const { t } = require('../utils/i18n');
const { findByPlatform } = require('../db/users');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'meincommand',           // Hauptname des Commands
  aliases: ['mc', 'meincmd'],    // Alternative Namen (optional)
  description: 'Beschreibung des Commands',
  async execute({ m, send, args }) {
    // Sprache aus Chat-DB laden
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}

    // Benutzer-Validierung
    const user = await findByPlatform(m.platform, m.sender);
    if (!user) {
      return send({ chat: m.chat, text: t('not_registered', lang) });
    }

    // Command-Logik hier
    const response = 'Hallo ' + user.name + '!';
    send({ chat: m.chat, text: response });
  }
};
```

2. **Parameter verwenden**:
   - `m`: Message-Objekt mit Absender, Chat, Platform-Info
   - `send`: Funktion zum Senden von Nachrichten
   - `args`: Array der Command-Argumente (z.B. bei `{PREFIX}cmd arg1 arg2`)

*Hinweis: `{PREFIX}` steht für den konfigurierten Prefix (Standard: `/`)*

3. **Mehrsprachigkeit**: Verwenden Sie die `t()`-Funktion für Übersetzungen:
```javascript
const message = t('welcome_message', lang, { name: user.name });
```

### Datenbankzugriff

**Nutzer-Datenbank:**
```javascript
const { findByPlatform, createOrReuseUser, saveUser } = require('../db/users');

// Benutzer finden
const user = await findByPlatform('whatsapp', '1234567890@s.whatsapp.net');

// Benutzer erstellen
const newUser = await createOrReuseUser({
  platform: 'telegram',
  platformId: '123456789',
  name: 'Max Mustermann'
});

// Benutzer speichern
await saveUser(user);
```

**Chat-Datenbank:**
```javascript
const { loadChatById, saveChatById } = require('../db/chats');

// Chat laden
const chat = await loadChatById('chatId');

// Chat-Einstellungen ändern
chat.language = 'en';
await saveChatById('chatId', chat);
```

### Plattform-spezifische Features

**WhatsApp-spezifisch:**
- Medienunterstützung (Bilder, Videos, Audio)
- Gruppenverwaltung
- Status-Updates

**Discord-spezifisch:**
- Voice-Channel-Integration
- Embed-Nachrichten
- Role-Management

**Telegram-spezifisch:**
- Inline-Keyboards
- Bot-Commands-Menu
- File-Sharing

### Konfiguration

Erstellen Sie eine `.env`-Datei basierend auf `.env.example`:

```env
# Command Prefix (Standard: /)
PREFIX=/

# WhatsApp (automatisch über QR-Code)
WA_SESSION_NAME=multi-bot

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_token

# Discord
DISCORD_BOT_TOKEN=your_discord_token
DISCORD_GUILD_ID=your_guild_id

# Allgemein
DEBUG=true
PORT=3000
```

**Prefix-Beispiele:**
- `PREFIX=/` - Standard (z.B. `/ping`, `/help`)
- `PREFIX=!` - Ausrufezeichen (z.B. `!ping`, `!help`)
- `PREFIX=.` - Punkt (z.B. `.ping`, `.help`)
- `PREFIX=bot ` - Wort mit Leerzeichen (z.B. `bot ping`, `bot help`)

### Testing

Testen Sie neue Commands mit:
```sh
npm run dev  # Startet mit Nodemon für Auto-Reload
```

## Nützliche Skripte
- `npm run db:list-users` – Listet alle User
- `npm run db:view-user` – Zeigt einen User
- `npm run db:del-user` – Löscht einen User
- `npm run db:list-chats` – Listet alle Chats
- `npm run db:view-chat` – Zeigt einen Chat
- `npm run db:del-chat` – Löscht einen Chat

## Lizenz
MIT
