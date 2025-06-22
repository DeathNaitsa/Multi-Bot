// File: server.js
// ---------------
// Express-Webserver, der sich bei "web" nur über SN + Passwort authentifiziert.
// Nutzt die Funktion findByPlatform('web', id) aus db/users.js.

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { findByPlatform } = require('./db/users');
const crypto = require('crypto');

// Debug-Logger einrichten
const debug = require('debug')('app:server');

const app = express();
const PORT = 3001;

// Mittels body-parser Formulardaten parsen
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Statische CSS/JS etc. aus "public" ausliefern (falls du etwas anlegst)
app.use(express.static(path.join(__dirname, 'public')));

// ── 1) GET /login: Login-Formular ─────────────────────────────────────────
app.get('/', (req, res) => {
  debug('GET / aufgerufen');
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Login</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin:0; padding:0; }
          .container { width: 300px; margin: 100px auto; padding: 20px; background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          h2 { text-align: center; }
          input[type=text], input[type=password] { width: 100%; padding: 8px; margin: 8px 0; box-sizing: border-box; }
          button { width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; cursor: pointer; border-radius: 3px; }
          button:hover { background: #0056b3; }
          .error { color: red; margin-bottom: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Login</h2>
          <form method="POST" action="/login">
            <label for="sn">ID (SN):</label><br />
            <input type="text" id="sn" name="sn" required /><br />
            <label for="password">Passwort:</label><br />
            <input type="password" id="password" name="password" required /><br />
            <button type="submit">Einloggen</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

// ── 2) POST /login: Prüfe SN + Passwort ────────────────────────────────────
app.post('/login', async (req, res) => {
  const { sn, password } = req.body;
  if (!sn || !password) {
    return res.send('<p class="error">Bitte sowohl ID als auch Passwort eingeben.</p>');
  }

  let userObj;
  try {
    userObj = await findByPlatform('web', sn);
  } catch (e) {
    console.error('Fehler in findByPlatform:', e);
    return res.status(500).send('<p class="error">Serverfehler beim Zugriff auf die DB.</p>');
  }
console.log('UserObj:', userObj);
  if (!userObj) {
    return res.send('<p class="error">ID nicht gefunden.</p>');
  }

  // Zugriff auf das erste Konto (falls mehrere Accounts pro SN, hier anpassen)
  const acc = Array.isArray(userObj.accounts) && userObj.accounts.length > 0
    ? userObj.accounts[0]
    : null;

  if (!acc || !acc.passwordHash) {
    return res.send('<p class="error">Kein Passwort gesetzt. Bitte im Chat mit !setpw setzen.</p>');
  }

  // Vergleiche MD5-Hash
  const hash = crypto.createHash('md5').update(password).digest('hex');
  if (hash !== acc.passwordHash) {
    return res.send('<p class="error">Falsches Passwort.</p>');
  }

  // Login erfolgreich → Weiterleitung auf Profilseite
  return res.redirect(`/profile?sn=${encodeURIComponent(sn)}`);
});

// ── 3) GET /profile: Zeige Profildaten ────────────────────────────────────
app.get('/profile', async (req, res) => {
  const sn = req.query.sn;
  if (!sn) {
    return res.status(400).send('<p class="error">Keine ID angegeben.</p>');
  }

  let userObj;
  try {
    userObj = await findByPlatform('web', sn);
  } catch (e) {
    console.error('Fehler in findByPlatform:', e);
    return res.status(500).send('<p class="error">Serverfehler beim Zugriff auf die DB.</p>');
  }

  if (!userObj) {
    return res.status(404).send('<p class="error">Nutzer nicht gefunden.</p>');
  }

  const acc = Array.isArray(userObj.accounts) && userObj.accounts.length > 0
    ? userObj.accounts[0]
    : {};

  // Rendere ein einfaches Profil
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Profil von ID ${sn}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin:0; padding:0; }
          .container { width: 400px; margin: 50px auto; padding: 20px; background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          h2 { text-align: center; }
          .field { margin: 10px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Profil von ID ${sn}</h2>
          <div class="field"><span class="label">Name:</span> ${acc.name || '—'}</div>
          <div class="field"><span class="label">Alter:</span> ${acc.age || '—'}</div>
          <div class="field"><span class="label">Registriert:</span> ${acc.registered ? 'Ja' : 'Nein'}</div>
          <div class="field"><span class="label">Seriennummer (SN):</span> ${acc.sn || '—'}</div>
          <div class="field"><span class="label">Passwort-Hash:</span> ${acc.passwordHash || '—'}</div>
          <p style="text-align:center;"><a href="/login">↩ Zurück zur Anmeldung</a></p>
        </div>
      </body>
    </html>
  `);
});

// ── 4) Starte den Express-Server ──────────────────────────────────────────
app.listen(PORT, () => {
  debug('Server wird gestartet...');
  console.log(`🌐 Web-Interface läuft auf http://localhost:${PORT}`);
});
