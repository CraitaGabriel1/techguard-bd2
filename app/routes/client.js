// =====================================================================
//  routes/client.js – zona clientului: coș, comandă, contul meu,
//  istoricul comenzilor și cererile de service
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { necesitaLogin, necesitaRol } = require('../middleware/auth');
const op = require('../lib/operatii');

const router = express.Router();
const doarClient = necesitaRol('Client');

// Returnează id-ul coșului clientului (îl creează dacă nu există)
async function idCos(idUtilizator) {
  const { rows } = await db.query(`
    INSERT INTO cosuri (id_utilizator) VALUES ($1)
    ON CONFLICT (id_utilizator) DO UPDATE SET data_actualizare = NOW()
    RETURNING id_cos`, [idUtilizator]);
  return rows[0].id_cos;
}

function inapoi(req) {
  return req.get('Referer') || '/';
}

// ======================= COȘUL DE CUMPĂRĂTURI ========================
router.get('/cos', doarClient, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT cp.id_produs, cp.cantitate, p.nume, p.pret, p.stoc, p.imagine_url, m.nume AS marca,
             cp.cantitate * p.pret AS subtotal
      FROM cosuri c
      JOIN cos_produse cp ON cp.id_cos = c.id_cos
      JOIN produse p      ON p.id_produs = cp.id_produs
      JOIN marci m        ON m.id_marca = p.id_marca
      WHERE c.id_utilizator = $1
      ORDER BY cp.data_adaugare`, [req.session.user.id]);

    const subtotal = rows.reduce((s, r) => s + Number(r.subtotal), 0);
    const transport = !rows.length || subtotal >= op.PRAG_TRANSPORT_GRATUIT ? 0 : op.COST_TRANSPORT;
    res.render('cos', { titlu: 'Coșul meu', produse: rows, subtotal, transport, prag: op.PRAG_TRANSPORT_GRATUIT });
  } catch (err) { next(err); }
});

// CREATE / UPDATE: adaugă produs în coș (dacă există deja, crește cantitatea)
router.post('/cos/adauga', async (req, res, next) => {
  // Dacă cererea vine din JavaScript (fetch), răspundem cu JSON și pagina NU se reîncarcă;
  // altfel (formular clasic) facem redirect, ca înainte.
  const ajax = req.get('Accept') === 'application/json';
  const raspunde = (tip, text, extra = {}, redirectClasic = inapoi(req)) => {
    if (ajax) return res.json({ ok: tip === 'succes', tip, mesaj: text, ...extra });
    req.session.flash = { tip, text };
    res.redirect(extra.redirect || redirectClasic);
  };

  try {
    const user = req.session.user;
    if (!user) {
      req.session.dupaLogin = inapoi(req);
      if (!ajax) req.session.flash = { tip: 'eroare', text: 'Autentifică-te ca să adaugi produse în coș.' };
      return ajax ? res.json({ ok: false, redirect: '/login', mesaj: 'Autentifică-te ca să adaugi produse în coș.' })
                  : res.redirect('/login');
    }
    if (user.rol !== 'Client') return raspunde('eroare', 'Doar clienții pot cumpăra. Folosește un cont de client.');

    const idProdus = Number(req.body.id_produs);
    const cantitate = Math.max(1, parseInt(req.body.cantitate) || 1);
    const p = (await db.query('SELECT nume, stoc FROM produse WHERE id_produs = $1 AND activ', [idProdus])).rows[0];
    if (!p || p.stoc < 1) return raspunde('eroare', 'Produsul nu este în stoc.');

    const id = await idCos(user.id);
    await db.query(`
      INSERT INTO cos_produse (id_cos, id_produs, cantitate) VALUES ($1, $2, LEAST($3::int, $4::int))
      ON CONFLICT (id_cos, id_produs)
      DO UPDATE SET cantitate = LEAST(cos_produse.cantitate + EXCLUDED.cantitate, $4::int)`,
      [id, idProdus, cantitate, p.stoc]);

    // Numărul nou de produse din coș (pentru bulina de lângă butonul Coș)
    const nrCos = Number((await db.query(
      'SELECT COALESCE(SUM(cantitate), 0) AS nr FROM cos_produse WHERE id_cos = $1', [id])).rows[0].nr);

    raspunde('succes', `„${p.nume}” a fost adăugat în coș.`, { nrCos },
      req.body.redirect === 'cos' ? '/cos' : inapoi(req));
  } catch (err) { next(err); }
});

// UPDATE: modifică cantitatea
router.post('/cos/actualizeaza', doarClient, async (req, res, next) => {
  try {
    const cantitate = parseInt(req.body.cantitate) || 0;
    const id = await idCos(req.session.user.id);
    if (cantitate <= 0) {
      await db.query('DELETE FROM cos_produse WHERE id_cos = $1 AND id_produs = $2', [id, req.body.id_produs]);
    } else {
      await db.query(`
        UPDATE cos_produse cp SET cantitate = LEAST($3::int, p.stoc)
        FROM produse p
        WHERE p.id_produs = cp.id_produs AND cp.id_cos = $1 AND cp.id_produs = $2`,
        [id, req.body.id_produs, cantitate]);
    }
    res.redirect('/cos');
  } catch (err) { next(err); }
});

// DELETE: scoate produsul din coș
router.post('/cos/sterge', doarClient, async (req, res, next) => {
  try {
    await db.query('DELETE FROM cos_produse WHERE id_cos = $1 AND id_produs = $2',
      [await idCos(req.session.user.id), req.body.id_produs]);
    req.session.flash = { tip: 'succes', text: 'Produsul a fost scos din coș.' };
    res.redirect('/cos');
  } catch (err) { next(err); }
});

// ======================= FINALIZAREA COMENZII ========================
router.get('/checkout', doarClient, async (req, res, next) => {
  try {
    const user = (await db.query('SELECT * FROM utilizatori WHERE id_utilizator = $1', [req.session.user.id])).rows[0];
    const { rows } = await db.query(`
      SELECT cp.cantitate, p.nume, p.pret, cp.cantitate * p.pret AS subtotal
      FROM cosuri c JOIN cos_produse cp ON cp.id_cos = c.id_cos JOIN produse p ON p.id_produs = cp.id_produs
      WHERE c.id_utilizator = $1`, [req.session.user.id]);
    if (!rows.length) return res.redirect('/cos');

    const subtotal = rows.reduce((s, r) => s + Number(r.subtotal), 0);
    const transport = subtotal >= op.PRAG_TRANSPORT_GRATUIT ? 0 : op.COST_TRANSPORT;
    res.render('checkout', { titlu: 'Finalizează comanda', produse: rows, subtotal, transport, u: user });
  } catch (err) { next(err); }
});

router.post('/checkout', doarClient, async (req, res, next) => {
  const d = req.body;
  try {
    if (!d.adresa || !d.oras || !d.judet || !d.telefon || !d.metoda_plata) {
      req.session.flash = { tip: 'eroare', text: 'Completează toate datele de livrare.' };
      return res.redirect('/checkout');
    }
    const { id_comanda, numar_comanda } = await op.plaseazaComanda(req.session.user.id, d);
    req.session.flash = { tip: 'succes', text: `Comanda ${numar_comanda} a fost plasată cu succes!` };
    res.redirect(`/cont/comenzi/${id_comanda}`);
  } catch (err) {
    if (err instanceof op.EroareUtilizator) {
      req.session.flash = { tip: 'eroare', text: err.message };
      return res.redirect('/cos');
    }
    next(err);
  }
});

// ======================= CONTUL MEU ==================================
router.get('/cont', necesitaLogin, async (req, res, next) => {
  try {
    const u = (await db.query(`
      SELECT u.*, r.nume_rol FROM utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
      WHERE u.id_utilizator = $1`, [req.session.user.id])).rows[0];
    const stat = (await db.query(`
      SELECT (SELECT COUNT(*) FROM comenzi WHERE id_utilizator = $1) AS nr_comenzi,
             (SELECT COALESCE(SUM(total), 0) FROM comenzi WHERE id_utilizator = $1 AND status <> 'anulata') AS total_cheltuit,
             (SELECT COUNT(*) FROM cereri_service WHERE id_client = $1) AS nr_service`, [u.id_utilizator])).rows[0];
    res.render('cont/profil', { titlu: 'Contul meu', u, stat });
  } catch (err) { next(err); }
});

// UPDATE: datele personale
router.post('/cont', necesitaLogin, async (req, res, next) => {
  try {
    const d = req.body;
    if (!d.nume || !d.prenume) {
      req.session.flash = { tip: 'eroare', text: 'Numele și prenumele sunt obligatorii.' };
      return res.redirect('/cont');
    }
    await db.query(`
      UPDATE utilizatori SET nume = $1, prenume = $2, telefon = $3, adresa = $4, oras = $5, judet = $6
      WHERE id_utilizator = $7`,
      [d.nume, d.prenume, d.telefon || null, d.adresa || null, d.oras || null, d.judet || null, req.session.user.id]);
    req.session.user.nume = d.nume;
    req.session.user.prenume = d.prenume;
    req.session.flash = { tip: 'succes', text: 'Datele au fost actualizate.' };
    res.redirect('/cont');
  } catch (err) { next(err); }
});

// UPDATE: schimbarea parolei
router.post('/cont/parola', necesitaLogin, async (req, res, next) => {
  try {
    const { parola_veche, parola_noua, parola_noua2 } = req.body;
    const { rows } = await db.query('SELECT parola_hash FROM utilizatori WHERE id_utilizator = $1', [req.session.user.id]);
    let eroare = null;
    if (!(await bcrypt.compare(parola_veche || '', rows[0].parola_hash))) eroare = 'Parola actuală este greșită.';
    else if (!parola_noua || parola_noua.length < 8) eroare = 'Parola nouă trebuie să aibă minimum 8 caractere.';
    else if (parola_noua !== parola_noua2) eroare = 'Parolele noi nu coincid.';

    if (eroare) {
      req.session.flash = { tip: 'eroare', text: eroare };
    } else {
      await db.query('UPDATE utilizatori SET parola_hash = $1 WHERE id_utilizator = $2',
        [await bcrypt.hash(parola_noua, 10), req.session.user.id]);
      req.session.flash = { tip: 'succes', text: 'Parola a fost schimbată.' };
    }
    res.redirect('/cont');
  } catch (err) { next(err); }
});

// ---- Istoricul comenzilor -------------------------------------------
router.get('/cont/comenzi', doarClient, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, (SELECT SUM(cantitate) FROM detalii_comanda d WHERE d.id_comanda = c.id_comanda) AS nr_produse
      FROM comenzi c
      WHERE c.id_utilizator = $1
      ORDER BY c.data_comanda DESC`, [req.session.user.id]);
    res.render('cont/comenzi', { titlu: 'Comenzile mele', comenzi: rows });
  } catch (err) { next(err); }
});

router.get('/cont/comenzi/:id', doarClient, async (req, res, next) => {
  try {
    const comanda = (await db.query(
      'SELECT * FROM comenzi WHERE id_comanda = $1 AND id_utilizator = $2', [req.params.id, req.session.user.id])).rows[0];
    if (!comanda) return res.status(404).render('eroare', { titlu: 'Comandă inexistentă', mesaj: 'Comanda nu există.' });
    const produse = (await db.query(`
      SELECT d.*, p.nume, p.imagine_url, d.cantitate * d.pret_unitar AS subtotal
      FROM detalii_comanda d JOIN produse p ON p.id_produs = d.id_produs
      WHERE d.id_comanda = $1`, [comanda.id_comanda])).rows;
    res.render('cont/comanda', { titlu: `Comanda ${comanda.numar_comanda}`, comanda, produse });
  } catch (err) { next(err); }
});

// Clientul își poate anula comanda doar cât timp este "plasată"
router.post('/cont/comenzi/:id/anuleaza', doarClient, async (req, res, next) => {
  try {
    const c = (await db.query('SELECT status FROM comenzi WHERE id_comanda = $1 AND id_utilizator = $2',
      [req.params.id, req.session.user.id])).rows[0];
    if (!c || c.status !== 'plasata') {
      req.session.flash = { tip: 'eroare', text: 'Comanda nu mai poate fi anulată (a intrat deja în procesare).' };
    } else {
      await op.schimbaStatusComanda(req.params.id, 'anulata', req.session.user.id);
      req.session.flash = { tip: 'succes', text: 'Comanda a fost anulată, iar produsele au revenit în stoc.' };
    }
    res.redirect(`/cont/comenzi/${req.params.id}`);
  } catch (err) { next(err); }
});

// ---- Cererile de service ale clientului -----------------------------
router.post('/service/cerere', doarClient, async (req, res, next) => {
  try {
    const d = req.body;
    if (!d.id_serviciu || !d.tip_dispozitiv || !d.marca_dispozitiv || !d.descriere_problema) {
      req.session.flash = { tip: 'eroare', text: 'Completează câmpurile obligatorii ale cererii.' };
      return res.redirect('/service#cerere');
    }
    const { numar_cerere, id_cerere } = await op.creeazaCerereService(req.session.user.id, d);
    req.session.flash = { tip: 'succes', text: `Cererea ${numar_cerere} a fost înregistrată. Te contactăm în curând!` };
    res.redirect(`/cont/service/${id_cerere}`);
  } catch (err) {
    if (err instanceof op.EroareUtilizator) {
      req.session.flash = { tip: 'eroare', text: err.message };
      return res.redirect('/service#cerere');
    }
    next(err);
  }
});
router.get('/service/cerere', (req, res) => res.redirect('/service#cerere'));

router.get('/cont/service', doarClient, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT cs.*, s.nume AS serviciu
      FROM cereri_service cs JOIN servicii s ON s.id_serviciu = cs.id_serviciu
      WHERE cs.id_client = $1
      ORDER BY cs.data_cerere DESC`, [req.session.user.id]);
    res.render('cont/service', { titlu: 'Cererile mele de service', cereri: rows });
  } catch (err) { next(err); }
});

router.get('/cont/service/:id', doarClient, async (req, res, next) => {
  try {
    const cerere = (await db.query(`
      SELECT cs.*, s.nume AS serviciu, a.nume || ' ' || a.prenume AS angajat
      FROM cereri_service cs
      JOIN servicii s ON s.id_serviciu = cs.id_serviciu
      LEFT JOIN utilizatori a ON a.id_utilizator = cs.id_angajat
      WHERE cs.id_cerere = $1 AND cs.id_client = $2`, [req.params.id, req.session.user.id])).rows[0];
    if (!cerere) return res.status(404).render('eroare', { titlu: 'Cerere inexistentă', mesaj: 'Cererea nu există.' });
    const istoric = (await db.query(`
      SELECT i.*, u.prenume || ' ' || u.nume AS autor
      FROM istoric_service i JOIN utilizatori u ON u.id_utilizator = i.id_utilizator
      WHERE i.id_cerere = $1 ORDER BY i.data_modificare`, [cerere.id_cerere])).rows;
    res.render('cont/cerere', { titlu: `Cererea ${cerere.numar_cerere}`, cerere, istoric });
  } catch (err) { next(err); }
});

module.exports = router;
