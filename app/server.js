// =====================================================================
//  server.js – punctul de pornire al aplicației TECHGUARD
//  Pornire:  npm start   →   http://localhost:3000
// =====================================================================
require('dotenv').config();               // citește setările din fișierul .env
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Setări generale ------------------------------------------------
app.set('view engine', 'ejs');                           // paginile sunt fișiere .ejs
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'))); // CSS, imagini, JS
// Fișierele statice care lipsesc (ex. o imagine de produs) primesc direct 404,
// fără să mai treacă prin restul aplicației
app.use(['/img', '/css', '/js', '/favicon.ico'], (req, res) => res.status(404).end());
app.use(express.urlencoded({ extended: true }));         // citește datele din formulare

// ---- Sesiuni: țin minte cine e logat (cookie în browser) ------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'techguard-secret-proiect-bd2',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },  // 8 ore
}));

// ---- Funcții ajutătoare disponibile în toate paginile .ejs ----------
// Versiune pentru CSS/JS: se schimbă la fiecare pornire, ca browserul să nu folosească fișiere vechi din cache
app.locals.v = Date.now();
app.locals.lei = (x) => Number(x || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
app.locals.data = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
app.locals.dataOra = (d) => d ? new Date(d).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
app.locals.STATUS_COMANDA = { plasata: 'Plasată', procesata: 'Procesată', expediata: 'Expediată', livrata: 'Livrată', anulata: 'Anulată' };
app.locals.STATUS_SERVICE = { inregistrata: 'Înregistrată', in_lucru: 'În lucru', finalizata: 'Finalizată', predata: 'Predată' };
app.locals.PLATA = { card: 'Card online', ramburs: 'Ramburs la curier', transfer: 'Transfer bancar' };

// ---- Date comune pentru TOATE paginile (header, meniu, coș) ---------
app.use(async (req, res, next) => {
  try {
    res.locals.user = req.session.user || null;
    res.locals.flash = req.session.flash || null;   // mesaj afișat o singură dată
    delete req.session.flash;
    res.locals.cale = req.path;

    // Meniul de categorii: categoriile principale + subcategoriile lor (self-join)
    const { rows } = await db.query(`
      SELECT p.id_categorie, p.nume, p.slug,
             COALESCE(
               json_agg(json_build_object('nume', c.nume, 'slug', c.slug) ORDER BY c.nume)
               FILTER (WHERE c.id_categorie IS NOT NULL), '[]'
             ) AS subcategorii
      FROM categorii p
      LEFT JOIN categorii c ON c.id_parinte = p.id_categorie
      WHERE p.id_parinte IS NULL
      GROUP BY p.id_categorie
      ORDER BY p.id_categorie`);
    res.locals.meniuCategorii = rows;

    // Numărul de produse din coș (doar pentru clienți)
    res.locals.nrCos = 0;
    if (req.session.user && req.session.user.rol === 'Client') {
      const r = await db.query(`
        SELECT COALESCE(SUM(cp.cantitate), 0) AS nr
        FROM cosuri c JOIN cos_produse cp ON cp.id_cos = c.id_cos
        WHERE c.id_utilizator = $1`, [req.session.user.id]);
      res.locals.nrCos = Number(r.rows[0].nr);
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ---- Rutele aplicației ----------------------------------------------
app.use('/', require('./routes/public'));   // magazin: acasă, catalog, produs, service
app.use('/', require('./routes/auth'));     // login, înregistrare, logout
app.use('/', require('./routes/client'));   // coș, comandă, contul meu
app.use('/admin', require('./routes/admin')); // panoul de administrare

// ---- Test conexiune la baza de date ---------------------------------
app.get('/test-db', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 'roluri' AS tabel, COUNT(*) FROM roluri
      UNION ALL SELECT 'utilizatori', COUNT(*) FROM utilizatori
      UNION ALL SELECT 'categorii',   COUNT(*) FROM categorii
      UNION ALL SELECT 'marci',       COUNT(*) FROM marci
      UNION ALL SELECT 'produse',     COUNT(*) FROM produse
      UNION ALL SELECT 'comenzi',     COUNT(*) FROM comenzi
      UNION ALL SELECT 'cereri_service', COUNT(*) FROM cereri_service`);
    res.json({ conexiune: 'OK', tabele: rows });
  } catch (err) {
    res.status(500).json({ conexiune: 'EROARE', mesaj: err.message });
  }
});

// ---- Pagina 404 și erori --------------------------------------------
app.use((req, res) => res.status(404).render('eroare', {
  titlu: 'Pagina nu există', mesaj: 'Pagina căutată nu există.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('eroare', { titlu: 'Eroare de server', mesaj: err.message });
});

// ---- Pornire server -------------------------------------------------
app.listen(PORT, () => {
  console.log(`TECHGUARD rulează pe http://localhost:${PORT}`);
});
