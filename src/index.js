import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { PrismaClient } from '@prisma/client';

import authRouter from './routes/auth.js';
import { ensureAuthenticated } from './middleware/auth.js';

dotenv.config();
const prisma = new PrismaClient();
const app = express();

// ── Security Middlewares ────────────────────────────────────────────────────
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(cookieParser());

// ── Session & CSRF ──────────────────────────────────────────────────────────
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000
    }
  })
);
app.use(csurf());

// ── View engine + parsing ───────────────────────────────────────────────────
app.set('view engine', 'ejs');
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: false }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/', authRouter(prisma));

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).send('Form expired');
  console.error(err);
  res.status(500).send('Server error');
});

// ── Startup ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3004;
if (process.env.NODE_ENV === 'production') {
  const key = fs.readFileSync(process.env.TLS_KEY_PATH, 'utf8');
  const cert = fs.readFileSync(process.env.TLS_CERT_PATH, 'utf8');
  https.createServer({ key, cert }, app).listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => console.log(`Dev server on http://localhost:${PORT}`));
}
