// =====================================================================
//  routes/public.js – paginile magazinului vizibile pentru toată lumea
//  (Vizitator, Client, Angajat, Administrator)
// =====================================================================
const express = require('express');
const db = require('../db');

const router = express.Router();
const PE_PAGINA = 12;

// Coloanele afișate pe cardul unui produs (refolosite în mai multe interogări)
const COLOANE_CARD = `
  p.id_produs, p.nume, p.pret, p.stoc, p.imagine_url, p.garantie_luni,
  m.nume AS marca, c.nume AS categorie`;

// ---- PRIMA PAGINĂ ---------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    // Categoriile principale: câte produse au și prețul minim ("de la X lei")
    const categorii = await db.query(`
      SELECT p.nume, p.slug, p.descriere,
             COUNT(pr.id_produs) AS nr_produse,
             MIN(pr.pret)        AS pret_minim
      FROM categorii p
      LEFT JOIN categorii c ON c.id_parinte = p.id_categorie OR c.id_categorie = p.id_categorie
      LEFT JOIN produse pr  ON pr.id_categorie = c.id_categorie AND pr.activ
      WHERE p.id_parinte IS NULL
      GROUP BY p.id_categorie
      ORDER BY p.id_categorie`);

    // Cele mai vândute produse (din comenzile care nu au fost anulate)
    const topVanzari = await db.query(`
      SELECT ${COLOANE_CARD}, SUM(dc.cantitate) AS bucati_vandute
      FROM detalii_comanda dc
      JOIN comenzi co   ON co.id_comanda = dc.id_comanda AND co.status <> 'anulata'
      JOIN produse p    ON p.id_produs = dc.id_produs AND p.activ
      JOIN marci m      ON m.id_marca = p.id_marca
      JOIN categorii c  ON c.id_categorie = p.id_categorie
      GROUP BY p.id_produs, m.nume, c.nume
      ORDER BY bucati_vandute DESC, p.nume
      LIMIT 8`);

    // Produsele adăugate cel mai recent
    const noutati = await db.query(`
      SELECT ${COLOANE_CARD}
      FROM produse p
      JOIN marci m     ON m.id_marca = p.id_marca
      JOIN categorii c ON c.id_categorie = p.id_categorie
      WHERE p.activ
      ORDER BY p.data_adaugare DESC, p.id_produs DESC
      LIMIT 8`);

    const servicii = await db.query(`
      SELECT nume, pret_estimativ FROM servicii WHERE activ ORDER BY id_serviciu LIMIT 4`);

    res.render('index', {
      titlu: 'Acasă',
      categorii: categorii.rows,
      topVanzari: topVanzari.rows,
      noutati: noutati.rows,
      servicii: servicii.rows,
    });
  } catch (err) { next(err); }
});

// ---- CATALOG: o categorie (/categorie/placi-video) sau căutare (/produse?q=...) ----
async function catalog(req, res, next, categorie) {
  try {
    const f = req.query;
    const conditii = ['p.activ'];
    const params = [];
    const adauga = (valoare) => { params.push(valoare); return `$${params.length}`; };

    // Filtrul pe categorie: produsele din categorie SAU din subcategoriile ei
    if (categorie) {
      const id = adauga(categorie.id_categorie);
      conditii.push(`(c.id_categorie = ${id} OR c.id_parinte = ${id})`);
    }
    // Căutare după text (nume, descriere, marcă)
    if (f.q && f.q.trim()) {
      const q = adauga(`%${f.q.trim()}%`);
      conditii.push(`(p.nume ILIKE ${q} OR p.descriere ILIKE ${q} OR m.nume ILIKE ${q})`);
    }
    // Condițiile de până aici definesc "setul de bază" – din el calculăm mărcile disponibile
    const conditiiBaza = conditii.slice();
    const paramsBaza = params.slice();

    // Filtre suplimentare
    const marciAlese = [].concat(f.marca || []).map(Number).filter(Boolean);
    if (marciAlese.length) conditii.push(`p.id_marca = ANY(${adauga(marciAlese)})`);
    if (f.pret_min) conditii.push(`p.pret >= ${adauga(Number(f.pret_min))}`);
    if (f.pret_max) conditii.push(`p.pret <= ${adauga(Number(f.pret_max))}`);
    if (f.in_stoc) conditii.push('p.stoc > 0');

    const ordine = {
      noi:       'p.data_adaugare DESC, p.id_produs DESC',
      pret_asc:  'p.pret ASC',
      pret_desc: 'p.pret DESC',
      nume:      'p.nume ASC',
    }[f.sort] || 'p.data_adaugare DESC, p.id_produs DESC';

    const pagina = Math.max(1, parseInt(f.pagina) || 1);
    const FROM = `
      FROM produse p
      JOIN marci m     ON m.id_marca = p.id_marca
      JOIN categorii c ON c.id_categorie = p.id_categorie`;

    const total = await db.query(`SELECT COUNT(*) AS n ${FROM} WHERE ${conditii.join(' AND ')}`, params);
    const produse = await db.query(`
      SELECT ${COLOANE_CARD} ${FROM}
      WHERE ${conditii.join(' AND ')}
      ORDER BY ${ordine}
      LIMIT ${PE_PAGINA} OFFSET ${(pagina - 1) * PE_PAGINA}`, params);

    // Pentru bara de filtre: mărcile din setul de bază, cu numărul de produse
    const marci = await db.query(`
      SELECT m.id_marca, m.nume, COUNT(*) AS nr ${FROM}
      WHERE ${conditiiBaza.join(' AND ')}
      GROUP BY m.id_marca ORDER BY m.nume`, paramsBaza);
    const interval = await db.query(`
      SELECT FLOOR(MIN(p.pret)) AS min, CEIL(MAX(p.pret)) AS max ${FROM}
      WHERE ${conditiiBaza.join(' AND ')}`, paramsBaza);

    // Subcategoriile (pentru a naviga mai departe) și calea (breadcrumb)
    let subcategorii = [], parinte = null;
    if (categorie) {
      subcategorii = (await db.query(
        'SELECT nume, slug FROM categorii WHERE id_parinte = $1 ORDER BY nume', [categorie.id_categorie])).rows;
      if (categorie.id_parinte) {
        parinte = (await db.query('SELECT nume, slug FROM categorii WHERE id_categorie = $1', [categorie.id_parinte])).rows[0];
      }
    }

    const nrTotal = Number(total.rows[0].n);
    res.render('catalog', {
      titlu: categorie ? categorie.nume : (f.q ? `Rezultate pentru „${f.q}”` : 'Toate produsele'),
      categorie, parinte, subcategorii,
      produse: produse.rows,
      marci: marci.rows,
      interval: interval.rows[0],
      filtre: { ...f, marci: marciAlese },
      nrTotal, pagina, nrPagini: Math.max(1, Math.ceil(nrTotal / PE_PAGINA)),
    });
  } catch (err) { next(err); }
}

router.get('/produse', (req, res, next) => catalog(req, res, next, null));

router.get('/categorie/:slug', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM categorii WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('eroare', { titlu: 'Categorie inexistentă', mesaj: 'Categoria căutată nu există.' });
    catalog(req, res, next, rows[0]);
  } catch (err) { next(err); }
});

// ---- PAGINA UNUI PRODUS ---------------------------------------------
router.get('/produs/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, m.nume AS marca, m.website AS marca_website,
             c.nume AS categorie, c.slug AS categorie_slug,
             pc.nume AS categorie_parinte, pc.slug AS categorie_parinte_slug
      FROM produse p
      JOIN marci m          ON m.id_marca = p.id_marca
      JOIN categorii c      ON c.id_categorie = p.id_categorie
      LEFT JOIN categorii pc ON pc.id_categorie = c.id_parinte
      WHERE p.id_produs = $1 AND p.activ`, [req.params.id]);
    const produs = rows[0];
    if (!produs) return res.status(404).render('eroare', { titlu: 'Produs inexistent', mesaj: 'Produsul nu există sau nu mai este disponibil.' });

    const similare = await db.query(`
      SELECT ${COLOANE_CARD}
      FROM produse p
      JOIN marci m     ON m.id_marca = p.id_marca
      JOIN categorii c ON c.id_categorie = p.id_categorie
      WHERE p.activ AND p.id_categorie = $1 AND p.id_produs <> $2
      ORDER BY ABS(p.pret - $3) LIMIT 4`, [produs.id_categorie, produs.id_produs, produs.pret]);

    res.render('produs', { titlu: produs.nume, produs, similare: similare.rows });
  } catch (err) { next(err); }
});

// ---- SERVICE --------------------------------------------------------
router.get('/service', async (req, res, next) => {
  try {
    const servicii = await db.query('SELECT * FROM servicii WHERE activ ORDER BY id_serviciu');
    res.render('service', { titlu: 'Service TECHGUARD', servicii: servicii.rows, date: {} });
  } catch (err) { next(err); }
});

module.exports = router;
