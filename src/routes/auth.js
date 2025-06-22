import { Router } from 'express';
import argon2 from 'argon2';
import { validationResult, body } from 'express-validator';

export default function authRouter(prisma) {
  const router = Router();

  // ── Register ──────────────────────────────────────────────────────────────
  router.get('/register', (req, res) => {
    res.render('register', { csrf: req.csrfToken(), errors: [] });
  });

  router.post(
    '/register',
    [body('email').isEmail(), body('password').isLength({ min: 8 })],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.render('register', { csrf: req.csrfToken(), errors: errors.array() });

      const { email, password } = req.body;
      const hash = await argon2.hash(password);

      try {
        const user = await prisma.user.create({ data: { email, password: hash } });
        req.session.user = { id: user.id, email: user.email };
        res.redirect('/dashboard');
      } catch (e) {
        if (e.code === 'P2002') {
          return res.render('register', { csrf: req.csrfToken(), errors: [{ msg: 'User exists' }] });
        }
        throw e;
      }
    }
  );

  // ── Login ─────────────────────────────────────────────────────────────────
  router.get('/login', (req, res) => {
    res.render('login', { csrf: req.csrfToken(), errors: [] });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.password, password))) {
      return res.render('login', { csrf: req.csrfToken(), errors: [{ msg: 'Invalid credentials' }] });
    }
    req.session.user = { id: user.id, email: user.email };
    res.redirect('/dashboard');
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  return router;
}
