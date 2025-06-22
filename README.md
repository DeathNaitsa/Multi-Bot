# Modular-Bot

Ein modularer, plattformübergreifender Bot für WhatsApp, Telegram und Discord mit dateibasierter User- und Chat-DB.

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

## Nützliche Skripte
- `npm run db:list-users` – Listet alle User
- `npm run db:view-user` – Zeigt einen User
- `npm run db:del-user` – Löscht einen User
- `npm run db:list-chats` – Listet alle Chats
- `npm run db:view-chat` – Zeigt einen Chat
- `npm run db:del-chat` – Löscht einen Chat

## Lizenz
MIT

---

> Vorlage und Inspiration: [Multi-Bot von DeathNaitsa](https://github.com/DeathNaitsa/Multi-Bot)
