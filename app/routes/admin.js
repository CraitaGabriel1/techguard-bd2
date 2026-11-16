// =====================================================================
//  routes/admin.js – panoul de administrare (CRUD complet)
//  Angajat + Administrator: produse, mărci, stocuri, comenzi, service
//  Doar Administrator:      categorii, utilizatori, servicii
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { necesitaRol } = require('../middleware/auth');
const op = require('../lib/operatii');

const router = express.Router();
const doarAdmin = necesitaRol('Administrator');

// Tot panoul este accesibil doar personalului
router.use(necesitaRol('Angajat', 'Administrator'));

const flash = (req, tip, text) => { req.session.flash = { tip, text }; };

// Codul 23503 = încălcarea unei chei străine (rândul e folosit în alt tabel)
// Codul 23505 = valoare duplicat într-o coloană UNIQUE
function mesajEroareBD(err) {
  if (err.code === '23503') return 'Înregistrarea nu poate fi ștearsă deoarece este folosită în alte tabele.';
  if (err.code === '23505') return 'Există deja o înregistrare cu această valoare (câmp unic): ' + (err.detail || '');
  if (err.code === '23514') return 'Valoare invalidă (nu respectă o regulă CHECK): ' + (err.constraint || '');
  return null;
}

// ======================= PANOU PRINCIPAL ============================
router.get('/', async (req, res, next) => {
  try {
    const stat = (await db.query(`
      SELECT
        (SELECT COUNT(*) FROM produse WHERE activ)                                   AS produse_active,
        (SELECT COUNT(*) FROM produse WHERE activ AND stoc <= 5)                     AS stoc_redus,
        (SELECT COUNT(*) FROM comenzi WHERE status IN ('plasata', 'procesata'))      AS comenzi_de_procesat,
        (SELECT COALESCE(SUM(total), 0) FROM comenzi WHERE status <> 'anulata'
            AND data_comanda >= date_trunc('month', NOW()))                          AS vanzari_luna,
        (SELECT COUNT(*) FROM cereri_service WHERE status IN ('inregistrata', 'in_lucru')) AS service_deschise,
        (SELECT COUNT(*) FROM utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
            WHERE r.nume_rol = 'Client')                                             AS clienti`)).rows[0];

    const ultimeleComenzi = (await db.query(`
      SELECT c.id_comanda, c.numar_comanda, c.data_comanda, c.status, c.total,
             u.prenume || ' ' || u.nume AS client
      FROM comenzi c JOIN utilizatori u ON u.id_utilizator = c.id_utilizator
      ORDER BY c.data_comanda DESC LIMIT 6`)).rows;

    const stocRedus = (await db.query(`
      SELECT id_produs, nume, stoc FROM produse WHERE activ AND stoc <= 5 ORDER BY stoc, nume LIMIT 6`)).rows;

    res.render('admin/dashboard', { titlu: 'Panou de administrare', stat, ultimeleComenzi, stocRedus });
  } catch (err) { next(err); }
});

// Date pentru panoul principal, actualizate automat la câteva secunde (JSON)
router.get('/api/live', async (req, res, next) => {
  try {
    const stat = (await db.query(`
      SELECT
        (SELECT COUNT(*) FROM produse WHERE activ)                                   AS produse_active,
        (SELECT COUNT(*) FROM produse WHERE activ AND stoc <= 5)                     AS stoc_redus,
        (SELECT COUNT(*) FROM comenzi WHERE status IN ('plasata', 'procesata'))      AS comenzi_de_procesat,
        (SELECT COALESCE(SUM(total), 0) FROM comenzi WHERE status <> 'anulata'
            AND data_comanda >= date_trunc('month', NOW()))                          AS vanzari_luna,
        (SELECT COUNT(*) FROM cereri_service WHERE status IN ('inregistrata', 'in_lucru')) AS service_deschise,
        (SELECT COUNT(*) FROM utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
            WHERE r.nume_rol = 'Client')                                             AS clienti`)).rows[0];
    const comenzi = (await db.query(`
      SELECT c.id_comanda, c.numar_comanda, c.status, c.total, u.prenume || ' ' || u.nume AS client
      FROM comenzi c JOIN utilizatori u ON u.id_utilizator = c.id_utilizator
      ORDER BY c.data_comanda DESC LIMIT 6`)).rows;
    res.json({ stat, comenzi });
  } catch (err) { next(err); }
});

// ======================= PRODUSE ====================================
async function dateFormularProdus() {
  const categorii = (await db.query(`
    SELECT c.id_categorie, c.nume, p.nume AS parinte
    FROM categorii c LEFT JOIN categorii p ON p.id_categorie = c.id_parinte
    ORDER BY COALESCE(p.nume, c.nume), c.id_parinte NULLS FIRST, c.nume`)).rows;
  const marci = (await db.query('SELECT id_marca, nume FROM marci ORDER BY nume')).rows;
  return { categorii, marci };
}

// READ: lista produselor, cu căutare, filtru pe categorie și paginare
router.get('/produse', async (req, res, next) => {
  try {
    const { q = '', categorie = '', stare = '' } = req.query;
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const conditii = ['TRUE'], params = [];
    if (q) { params.push(`%${q}%`); conditii.push(`(p.nume ILIKE $${params.length} OR p.cod_produs ILIKE $${params.length})`); }
    if (categorie) { params.push(categorie); conditii.push(`(c.id_categorie = $${params.length} OR c.id_parinte = $${params.length})`); }
    if (stare === 'activ') conditii.push('p.activ');
    if (stare === 'inactiv') conditii.push('NOT p.activ');
    if (stare === 'stoc_redus') conditii.push('p.stoc <= 5');

    const FROM = `FROM produse p JOIN marci m ON m.id_marca = p.id_marca JOIN categorii c ON c.id_categorie = p.id_categorie
                  WHERE ${conditii.join(' AND ')}`;
    const total = Number((await db.query(`SELECT COUNT(*) AS n ${FROM}`, params)).rows[0].n);
    const produse = (await db.query(`
      SELECT p.id_produs, p.cod_produs, p.nume, p.pret, p.stoc, p.activ, m.nume AS marca, c.nume AS categorie
      ${FROM} ORDER BY p.id_produs DESC LIMIT 20 OFFSET ${(pagina - 1) * 20}`, params)).rows;
    const categorii = (await db.query('SELECT id_categorie, nume FROM categorii WHERE id_parinte IS NULL ORDER BY id_categorie')).rows;

    res.render('admin/produse', { titlu: 'Produse', produse, categorii, f: req.query,
      pagina, nrPagini: Math.max(1, Math.ceil(total / 20)), total });
  } catch (err) { next(err); }
});

router.get('/produse/nou', async (req, res, next) => {
  try {
    res.render('admin/produs-form', { titlu: 'Produs nou', p: { activ: true, garantie_luni: 24 }, ...(await dateFormularProdus()) });
  } catch (err) { next(err); }
});

router.get('/produse/:id/editeaza', async (req, res, next) => {
  try {
    const p = (await db.query('SELECT * FROM produse WHERE id_produs = $1', [req.params.id])).rows[0];
    if (!p) return res.redirect('/admin/produse');
    p.specificatii = p.specificatii ? JSON.stringify(p.specificatii, null, 2) : '';
    res.render('admin/produs-form', { titlu: `Editează: ${p.nume}`, p, ...(await dateFormularProdus()) });
  } catch (err) { next(err); }
});

// Citește și validează câmpurile formularului de produs
function citesteProdus(body) {
  let specificatii = null;
  if (body.specificatii && body.specificatii.trim()) {
    try { specificatii = JSON.parse(body.specificatii); }
    catch { throw new op.EroareUtilizator('Specificațiile nu sunt un JSON valid. Exemplu: {"socket": "AM5", "nuclee": 8}'); }
  }
  if (!body.nume || !body.cod_produs || !body.id_categorie || !body.id_marca || body.pret === '') {
    throw new op.EroareUtilizator('Completează câmpurile obligatorii.');
  }
  return [body.id_categorie, body.id_marca, body.cod_produs.trim(), body.nume.trim(), body.descriere || null,
          body.pret, body.garantie_luni || 0, body.imagine_url || null, specificatii, body.activ === 'on'];
}

// CREATE
router.post('/produse', async (req, res, next) => {
  try {
    const valori = citesteProdus(req.body);
    const stocInitial = Math.max(0, parseInt(req.body.stoc) || 0);
    await op.tranzactie(async (client) => {
      const { rows } = await client.query(`
        INSERT INTO produse (id_categorie, id_marca, cod_produs, nume, descriere, pret, garantie_luni,
                             imagine_url, specificatii, activ, stoc)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id_produs`, [...valori, stocInitial]);
      if (stocInitial > 0) {
        await client.query(`
          INSERT INTO miscari_stoc (id_produs, id_utilizator, tip_miscare, cantitate, motiv)
          VALUES ($1, $2, 'intrare', $3, 'Stoc inițial la adăugarea produsului')`,
          [rows[0].id_produs, req.session.user.id, stocInitial]);
      }
    });
    flash(req, 'succes', 'Produsul a fost adăugat.');
    res.redirect('/admin/produse');
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    res.render('admin/produs-form', { titlu: 'Produs nou', p: req.body, flash: { tip: 'eroare', text: mesaj },
      ...(await dateFormularProdus()) });
  }
});

// UPDATE (stocul NU se modifică aici, ci prin mișcări de stoc, ca să rămână istoricul)
router.post('/produse/:id', async (req, res, next) => {
  try {
    const valori = citesteProdus(req.body);
    await db.query(`
      UPDATE produse SET id_categorie = $1, id_marca = $2, cod_produs = $3, nume = $4, descriere = $5,
             pret = $6, garantie_luni = $7, imagine_url = $8, specificatii = $9, activ = $10
      WHERE id_produs = $11`, [...valori, req.params.id]);
    flash(req, 'succes', 'Produsul a fost actualizat.');
    res.redirect('/admin/produse');
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    res.render('admin/produs-form', { titlu: 'Editează produsul', p: { ...req.body, id_produs: req.params.id },
      flash: { tip: 'eroare', text: mesaj }, ...(await dateFormularProdus()) });
  }
});

// DELETE: dacă produsul apare în comenzi/istoric, nu îl ștergem, ci îl dezactivăm
router.post('/produse/:id/sterge', async (req, res, next) => {
  try {
    await db.query('DELETE FROM produse WHERE id_produs = $1', [req.params.id]);
    flash(req, 'succes', 'Produsul a fost șters definitiv.');
  } catch (err) {
    if (err.code !== '23503') return next(err);
    await db.query('UPDATE produse SET activ = FALSE WHERE id_produs = $1', [req.params.id]);
    await db.query('DELETE FROM cos_produse WHERE id_produs = $1', [req.params.id]);
    flash(req, 'info', 'Produsul apare în comenzi sau în istoricul de stoc, așa că a fost DEZACTIVAT (ascuns din magazin), nu șters.');
  }
  res.redirect('/admin/produse');
});

// ======================= STOCURI ====================================
router.get('/stoc', async (req, res, next) => {
  try {
    const miscari = (await db.query(`
      SELECT ms.*, p.nume AS produs, p.cod_produs, u.prenume || ' ' || u.nume AS utilizator, c.numar_comanda
      FROM miscari_stoc ms
      JOIN produse p          ON p.id_produs = ms.id_produs
      LEFT JOIN utilizatori u ON u.id_utilizator = ms.id_utilizator
      LEFT JOIN comenzi c     ON c.id_comanda = ms.id_comanda
      WHERE ($1 = '' OR ms.id_produs::text = $1)
      ORDER BY ms.data_miscare DESC, ms.id_miscare DESC
      LIMIT 100`, [req.query.produs || ''])).rows;
    const produse = (await db.query('SELECT id_produs, cod_produs, nume, stoc FROM produse ORDER BY nume')).rows;
    res.render('admin/stoc', { titlu: 'Stocuri', miscari, produse, f: req.query });
  } catch (err) { next(err); }
});

// CREATE: mișcare de stoc manuală (intrare = recepție marfă, corecție = inventar)
router.post('/stoc', async (req, res, next) => {
  try {
    const { id_produs, tip_miscare, motiv } = req.body;
    let cantitate = parseInt(req.body.cantitate) || 0;
    if (!id_produs || !cantitate) throw new op.EroareUtilizator('Alege produsul și o cantitate diferită de 0.');
    if (tip_miscare === 'intrare') cantitate = Math.abs(cantitate);
    await op.miscareStoc(id_produs, tip_miscare, cantitate, motiv, req.session.user.id);
    flash(req, 'succes', 'Mișcarea de stoc a fost înregistrată.');
  } catch (err) {
    if (!(err instanceof op.EroareUtilizator)) return next(err);
    flash(req, 'eroare', err.message);
  }
  res.redirect('/admin/stoc');
});

// ======================= COMENZI ====================================
router.get('/comenzi', async (req, res, next) => {
  try {
    const { status = '', q = '' } = req.query;
    const comenzi = (await db.query(`
      SELECT c.*, u.prenume || ' ' || u.nume AS client, u.email
      FROM comenzi c JOIN utilizatori u ON u.id_utilizator = c.id_utilizator
      WHERE ($1 = '' OR c.status = $1)
        AND ($2 = '' OR c.numar_comanda ILIKE '%' || $2 || '%' OR u.nume ILIKE '%' || $2 || '%'
             OR u.prenume ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
      ORDER BY c.data_comanda DESC`, [status, q])).rows;
    res.render('admin/comenzi', { titlu: 'Comenzi', comenzi, f: req.query });
  } catch (err) { next(err); }
});

router.get('/comenzi/:id', async (req, res, next) => {
  try {
    const comanda = (await db.query(`
      SELECT c.*, u.prenume || ' ' || u.nume AS client, u.email
      FROM comenzi c JOIN utilizatori u ON u.id_utilizator = c.id_utilizator
      WHERE c.id_comanda = $1`, [req.params.id])).rows[0];
    if (!comanda) return res.redirect('/admin/comenzi');
    const produse = (await db.query(`
      SELECT d.*, p.nume, p.cod_produs, d.cantitate * d.pret_unitar AS subtotal
      FROM detalii_comanda d JOIN produse p ON p.id_produs = d.id_produs
      WHERE d.id_comanda = $1`, [comanda.id_comanda])).rows;
    res.render('admin/comanda', { titlu: `Comanda ${comanda.numar_comanda}`, comanda, produse });
  } catch (err) { next(err); }
});

// UPDATE: statusul comenzii (la "anulată" produsele revin în stoc)
router.post('/comenzi/:id/status', async (req, res, next) => {
  try {
    await op.schimbaStatusComanda(req.params.id, req.body.status, req.session.user.id);
    flash(req, 'succes', 'Statusul comenzii a fost actualizat.');
  } catch (err) {
    if (!(err instanceof op.EroareUtilizator)) return next(err);
    flash(req, 'eroare', err.message);
  }
  res.redirect(`/admin/comenzi/${req.params.id}`);
});

// ======================= SERVICE ====================================
router.get('/service', async (req, res, next) => {
  try {
    const { status = '' } = req.query;
    const cereri = (await db.query(`
      SELECT cs.*, s.nume AS serviciu, cl.prenume || ' ' || cl.nume AS client,
             an.prenume || ' ' || an.nume AS angajat
      FROM cereri_service cs
      JOIN servicii s          ON s.id_serviciu = cs.id_serviciu
      JOIN utilizatori cl      ON cl.id_utilizator = cs.id_client
      LEFT JOIN utilizatori an ON an.id_utilizator = cs.id_angajat
      WHERE ($1 = '' OR cs.status = $1)
      ORDER BY cs.data_cerere DESC`, [status])).rows;
    res.render('admin/service', { titlu: 'Cereri de service', cereri, f: req.query });
  } catch (err) { next(err); }
});

router.get('/service/:id', async (req, res, next) => {
  try {
    const cerere = (await db.query(`
      SELECT cs.*, s.nume AS serviciu, s.pret_estimativ, cl.prenume || ' ' || cl.nume AS client, cl.email, cl.telefon
      FROM cereri_service cs
      JOIN servicii s     ON s.id_serviciu = cs.id_serviciu
      JOIN utilizatori cl ON cl.id_utilizator = cs.id_client
      WHERE cs.id_cerere = $1`, [req.params.id])).rows[0];
    if (!cerere) return res.redirect('/admin/service');
    const istoric = (await db.query(`
      SELECT i.*, u.prenume || ' ' || u.nume AS autor
      FROM istoric_service i JOIN utilizatori u ON u.id_utilizator = i.id_utilizator
      WHERE i.id_cerere = $1 ORDER BY i.data_modificare`, [cerere.id_cerere])).rows;
    const angajati = (await db.query(`
      SELECT u.id_utilizator, u.prenume || ' ' || u.nume AS nume
      FROM utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
      WHERE r.nume_rol IN ('Angajat', 'Administrator') AND u.activ ORDER BY u.nume`)).rows;
    res.render('admin/cerere', { titlu: `Cererea ${cerere.numar_cerere}`, cerere, istoric, angajati });
  } catch (err) { next(err); }
});

router.post('/service/:id', async (req, res, next) => {
  try {
    await op.actualizeazaCerereService(req.params.id, req.body, req.session.user.id);
    flash(req, 'succes', 'Cererea a fost actualizată.');
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    flash(req, 'eroare', mesaj);
  }
  res.redirect(`/admin/service/${req.params.id}`);
});

// ======================= MĂRCI ======================================
router.get('/marci', async (req, res, next) => {
  try {
    const marci = (await db.query(`
      SELECT m.*, COUNT(p.id_produs) AS nr_produse
      FROM marci m LEFT JOIN produse p ON p.id_marca = m.id_marca
      GROUP BY m.id_marca ORDER BY m.nume`)).rows;
    const editare = req.query.editeaza ? marci.find(m => m.id_marca == req.query.editeaza) : null;
    res.render('admin/marci', { titlu: 'Mărci', marci, editare });
  } catch (err) { next(err); }
});

router.post('/marci', async (req, res, next) => {
  const { id_marca, nume, tara_origine, website } = req.body;
  try {
    if (!nume || !nume.trim()) throw new op.EroareUtilizator('Numele mărcii este obligatoriu.');
    if (id_marca) {
      await db.query('UPDATE marci SET nume = $1, tara_origine = $2, website = $3 WHERE id_marca = $4',
        [nume.trim(), tara_origine || null, website || null, id_marca]);
      flash(req, 'succes', 'Marca a fost actualizată.');
    } else {
      await db.query('INSERT INTO marci (nume, tara_origine, website) VALUES ($1, $2, $3)',
        [nume.trim(), tara_origine || null, website || null]);
      flash(req, 'succes', 'Marca a fost adăugată.');
    }
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    flash(req, 'eroare', mesaj);
  }
  res.redirect('/admin/marci');
});

router.post('/marci/:id/sterge', async (req, res, next) => {
  try {
    await db.query('DELETE FROM marci WHERE id_marca = $1', [req.params.id]);
    flash(req, 'succes', 'Marca a fost ștearsă.');
  } catch (err) {
    const mesaj = mesajEroareBD(err);
    if (!mesaj) return next(err);
    flash(req, 'eroare', 'Marca are produse asociate, deci nu poate fi ștearsă.');
  }
  res.redirect('/admin/marci');
});

// ======================= CATEGORII (doar Administrator) ==============
router.get('/categorii', doarAdmin, async (req, res, next) => {
  try {
    const categorii = (await db.query(`
      SELECT c.*, p.nume AS parinte,
             (SELECT COUNT(*) FROM produse pr WHERE pr.id_categorie = c.id_categorie) AS nr_produse,
             (SELECT COUNT(*) FROM categorii s WHERE s.id_parinte = c.id_categorie)   AS nr_subcategorii
      FROM categorii c LEFT JOIN categorii p ON p.id_categorie = c.id_parinte
      ORDER BY COALESCE(c.id_parinte, c.id_categorie), c.id_parinte NULLS FIRST, c.nume`)).rows;
    const editare = req.query.editeaza ? categorii.find(c => c.id_categorie == req.query.editeaza) : null;
    res.render('admin/categorii', { titlu: 'Categorii', categorii, editare,
      principale: categorii.filter(c => !c.id_parinte) });
  } catch (err) { next(err); }
});

// Generează un "slug" pentru URL: "Plăci video" → "placi-video"
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

router.post('/categorii', doarAdmin, async (req, res, next) => {
  const { id_categorie, nume, descriere } = req.body;
  const id_parinte = req.body.id_parinte || null;
  try {
    if (!nume || !nume.trim()) throw new op.EroareUtilizator('Numele categoriei este obligatoriu.');
    const slug = req.body.slug ? slugify(req.body.slug) : slugify(nume);
    if (id_categorie) {
      await db.query('UPDATE categorii SET nume = $1, slug = $2, descriere = $3, id_parinte = $4 WHERE id_categorie = $5',
        [nume.trim(), slug, descriere || null, id_parinte, id_categorie]);
      flash(req, 'succes', 'Categoria a fost actualizată.');
    } else {
      await db.query('INSERT INTO categorii (nume, slug, descriere, id_parinte) VALUES ($1, $2, $3, $4)',
        [nume.trim(), slug, descriere || null, id_parinte]);
      flash(req, 'succes', 'Categoria a fost adăugată.');
    }
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    flash(req, 'eroare', mesaj);
  }
  res.redirect('/admin/categorii');
});

router.post('/categorii/:id/sterge', doarAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM categorii WHERE id_categorie = $1', [req.params.id]);
    flash(req, 'succes', 'Categoria a fost ștearsă.');
  } catch (err) {
    if (err.code !== '23503') return next(err);
    flash(req, 'eroare', 'Categoria are produse sau subcategorii, deci nu poate fi ștearsă.');
  }
  res.redirect('/admin/categorii');
});

// ======================= UTILIZATORI (doar Administrator) ============
router.get('/utilizatori', doarAdmin, async (req, res, next) => {
  try {
    const { q = '', rol = '' } = req.query;
    const utilizatori = (await db.query(`
      SELECT u.*, r.nume_rol,
             (SELECT COUNT(*) FROM comenzi c WHERE c.id_utilizator = u.id_utilizator) AS nr_comenzi
      FROM utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
      WHERE ($1 = '' OR u.nume ILIKE '%' || $1 || '%' OR u.prenume ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
        AND ($2 = '' OR r.nume_rol = $2)
      ORDER BY u.id_rol DESC, u.nume`, [q, rol])).rows;
    res.render('admin/utilizatori', { titlu: 'Utilizatori', utilizatori, f: req.query });
  } catch (err) { next(err); }
});

router.get('/utilizatori/nou', doarAdmin, async (req, res, next) => {
  try {
    const roluri = (await db.query('SELECT * FROM roluri ORDER BY id_rol')).rows;
    res.render('admin/utilizator-form', { titlu: 'Utilizator nou', u: { activ: true, id_rol: 1 }, roluri });
  } catch (err) { next(err); }
});

router.get('/utilizatori/:id/editeaza', doarAdmin, async (req, res, next) => {
  try {
    const u = (await db.query('SELECT * FROM utilizatori WHERE id_utilizator = $1', [req.params.id])).rows[0];
    if (!u) return res.redirect('/admin/utilizatori');
    const roluri = (await db.query('SELECT * FROM roluri ORDER BY id_rol')).rows;
    res.render('admin/utilizator-form', { titlu: `Editează: ${u.prenume} ${u.nume}`, u, roluri });
  } catch (err) { next(err); }
});

router.post('/utilizatori', doarAdmin, async (req, res, next) => {
  const d = req.body;
  try {
    if (!d.nume || !d.prenume || !d.email || !d.parola) throw new op.EroareUtilizator('Completează câmpurile obligatorii (inclusiv parola).');
    if (d.parola.length < 8) throw new op.EroareUtilizator('Parola trebuie să aibă minimum 8 caractere.');
    await db.query(`
      INSERT INTO utilizatori (id_rol, nume, prenume, email, parola_hash, telefon, adresa, oras, judet, activ)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [d.id_rol, d.nume, d.prenume, d.email.trim().toLowerCase(), await bcrypt.hash(d.parola, 10),
       d.telefon || null, d.adresa || null, d.oras || null, d.judet || null, d.activ === 'on']);
    flash(req, 'succes', 'Utilizatorul a fost creat.');
    res.redirect('/admin/utilizatori');
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    const roluri = (await db.query('SELECT * FROM roluri ORDER BY id_rol')).rows;
    res.render('admin/utilizator-form', { titlu: 'Utilizator nou', u: d, roluri, flash: { tip: 'eroare', text: mesaj } });
  }
});

router.post('/utilizatori/:id', doarAdmin, async (req, res, next) => {
  const d = req.body;
  try {
    if (Number(req.params.id) === req.session.user.id && (d.activ !== 'on' || Number(d.id_rol) !== 3)) {
      throw new op.EroareUtilizator('Nu îți poți bloca propriul cont și nici nu îți poți scoate rolul de Administrator.');
    }
    await db.query(`
      UPDATE utilizatori SET id_rol = $1, nume = $2, prenume = $3, email = $4, telefon = $5,
             adresa = $6, oras = $7, judet = $8, activ = $9
      WHERE id_utilizator = $10`,
      [d.id_rol, d.nume, d.prenume, d.email.trim().toLowerCase(), d.telefon || null, d.adresa || null,
       d.oras || null, d.judet || null, d.activ === 'on', req.params.id]);
    if (d.parola) {
      if (d.parola.length < 8) throw new op.EroareUtilizator('Parola nouă trebuie să aibă minimum 8 caractere.');
      await db.query('UPDATE utilizatori SET parola_hash = $1 WHERE id_utilizator = $2',
        [await bcrypt.hash(d.parola, 10), req.params.id]);
    }
    flash(req, 'succes', 'Utilizatorul a fost actualizat.');
    res.redirect('/admin/utilizatori');
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    const roluri = (await db.query('SELECT * FROM roluri ORDER BY id_rol')).rows;
    res.render('admin/utilizator-form', { titlu: 'Editează utilizatorul', u: { ...d, id_utilizator: req.params.id },
      roluri, flash: { tip: 'eroare', text: mesaj } });
  }
});

router.post('/utilizatori/:id/sterge', doarAdmin, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.session.user.id) throw new op.EroareUtilizator('Nu îți poți șterge propriul cont.');
    await db.query('DELETE FROM utilizatori WHERE id_utilizator = $1', [req.params.id]);
    flash(req, 'succes', 'Utilizatorul a fost șters.');
  } catch (err) {
    if (err instanceof op.EroareUtilizator) flash(req, 'eroare', err.message);
    else if (err.code === '23503') {
      await db.query('UPDATE utilizatori SET activ = FALSE WHERE id_utilizator = $1', [req.params.id]);
      flash(req, 'info', 'Utilizatorul are comenzi sau cereri de service, așa că a fost BLOCAT (dezactivat), nu șters.');
    } else return next(err);
  }
  res.redirect('/admin/utilizatori');
});

// ======================= SERVICII (doar Administrator) ===============
router.get('/servicii', doarAdmin, async (req, res, next) => {
  try {
    const servicii = (await db.query(`
      SELECT s.*, (SELECT COUNT(*) FROM cereri_service c WHERE c.id_serviciu = s.id_serviciu) AS nr_cereri
      FROM servicii s ORDER BY s.id_serviciu`)).rows;
    const editare = req.query.editeaza ? servicii.find(s => s.id_serviciu == req.query.editeaza) : null;
    res.render('admin/servicii', { titlu: 'Servicii', servicii, editare });
  } catch (err) { next(err); }
});

router.post('/servicii', doarAdmin, async (req, res, next) => {
  const d = req.body;
  try {
    if (!d.nume || !d.nume.trim()) throw new op.EroareUtilizator('Numele serviciului este obligatoriu.');
    const valori = [d.nume.trim(), d.descriere || null, d.pret_estimativ || null, d.durata_estimata_zile || null, d.activ === 'on'];
    if (d.id_serviciu) {
      await db.query(`UPDATE servicii SET nume = $1, descriere = $2, pret_estimativ = $3, durata_estimata_zile = $4, activ = $5
                      WHERE id_serviciu = $6`, [...valori, d.id_serviciu]);
      flash(req, 'succes', 'Serviciul a fost actualizat.');
    } else {
      await db.query(`INSERT INTO servicii (nume, descriere, pret_estimativ, durata_estimata_zile, activ)
                      VALUES ($1, $2, $3, $4, $5)`, valori);
      flash(req, 'succes', 'Serviciul a fost adăugat.');
    }
  } catch (err) {
    const mesaj = err instanceof op.EroareUtilizator ? err.message : mesajEroareBD(err);
    if (!mesaj) return next(err);
    flash(req, 'eroare', mesaj);
  }
  res.redirect('/admin/servicii');
});

router.post('/servicii/:id/sterge', doarAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM servicii WHERE id_serviciu = $1', [req.params.id]);
    flash(req, 'succes', 'Serviciul a fost șters.');
  } catch (err) {
    if (err.code !== '23503') return next(err);
    await db.query('UPDATE servicii SET activ = FALSE WHERE id_serviciu = $1', [req.params.id]);
    flash(req, 'info', 'Serviciul are cereri asociate, așa că a fost DEZACTIVAT, nu șters.');
  }
  res.redirect('/admin/servicii');
});

module.exports = router;
