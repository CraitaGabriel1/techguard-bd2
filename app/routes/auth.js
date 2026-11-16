// =====================================================================
//  routes/auth.js – autentificare: login, înregistrare, logout
//  Parolele sunt salvate criptat (bcrypt) în coloana utilizatori.parola_hash
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// ---- LOGIN ----------------------------------------------------------
router.get('/login', (req, res) => {
  // ?next=/pagina → după autentificare revenim acolo (doar adrese interne, care încep cu „/”)
  if (req.query.next && /^\/(?!\/)/.test(req.query.next)) req.session.dupaLogin = req.query.next;
  if (req.session.user) return res.redirect('/cont');
  res.render('auth/login', { titlu: 'Autentificare', email: '' });
});

router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const parola = req.body.parola || '';

    const { rows } = await db.query(`
      SELECT u.id_utilizator, u.nume, u.prenume, u.email, u.parola_hash, u.activ, r.nume_rol
      FROM utilizatori u
      JOIN roluri r ON r.id_rol = u.id_rol
      WHERE LOWER(u.email) = $1`, [email]);
    const u = rows[0];

    // Comparăm parola introdusă cu hash-ul din baza de date
    if (!u || !(await bcrypt.compare(parola, u.parola_hash))) {
      return res.render('auth/login', { titlu: 'Autentificare', email,
        flash: { tip: 'eroare', text: 'Email sau parolă greșită.' } });
    }
    if (!u.activ) {
      return res.render('auth/login', { titlu: 'Autentificare', email,
        flash: { tip: 'eroare', text: 'Contul tău este blocat. Contactează un administrator.' } });
    }

    // Salvăm în sesiune datele utilizatorului (fără parolă!)
    req.session.user = { id: u.id_utilizator, nume: u.nume, prenume: u.prenume, email: u.email, rol: u.nume_rol };
    req.session.flash = { tip: 'succes', text: `Bine ai venit, ${u.prenume}!` };

    const destinatie = req.session.dupaLogin || (u.nume_rol === 'Client' ? '/' : '/admin');
    delete req.session.dupaLogin;
    res.redirect(destinatie);
  } catch (err) { next(err); }
});

// ---- ÎNREGISTRARE (cont nou de Client) ------------------------------
router.get('/inregistrare', (req, res) => {
  res.render('auth/inregistrare', { titlu: 'Cont nou', date: {} });
});

router.post('/inregistrare', async (req, res, next) => {
  const d = req.body;
  const reafiseaza = (text) => res.render('auth/inregistrare', {
    titlu: 'Cont nou', date: d, flash: { tip: 'eroare', text } });

  try {
    if (!d.nume || !d.prenume || !d.email || !d.parola) return reafiseaza('Completează câmpurile obligatorii.');
    if (d.parola.length < 8) return reafiseaza('Parola trebuie să aibă minimum 8 caractere.');
    if (d.parola !== d.parola2) return reafiseaza('Parolele nu coincid.');

    const email = d.email.trim().toLowerCase();
    const exista = await db.query('SELECT 1 FROM utilizatori WHERE LOWER(email) = $1', [email]);
    if (exista.rowCount) return reafiseaza('Există deja un cont cu acest email.');

    const hash = await bcrypt.hash(d.parola, 10);   // criptăm parola
    const { rows } = await db.query(`
      INSERT INTO utilizatori (id_rol, nume, prenume, email, parola_hash, telefon, adresa, oras, judet)
      VALUES ((SELECT id_rol FROM roluri WHERE nume_rol = 'Client'), $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_utilizator`,
      [d.nume.trim(), d.prenume.trim(), email, hash, d.telefon || null, d.adresa || null, d.oras || null, d.judet || null]);

    req.session.user = { id: rows[0].id_utilizator, nume: d.nume.trim(), prenume: d.prenume.trim(), email, rol: 'Client' };
    req.session.flash = { tip: 'succes', text: 'Contul a fost creat. Bine ai venit!' };
    res.redirect('/');
  } catch (err) { next(err); }
});

// ---- LOGOUT ---------------------------------------------------------
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
