// =====================================================================
//  lib/operatii.js – operații care modifică mai multe tabele deodată.
//  Toate rulează într-o TRANZACȚIE (BEGIN ... COMMIT): ori se execută
//  toți pașii, ori niciunul (ROLLBACK la orice eroare).
// =====================================================================
const db = require('../db');

const PRAG_TRANSPORT_GRATUIT = 500;
const COST_TRANSPORT = 19.99;

// Rulează funcția "pasi" într-o tranzacție, pe o conexiune dedicată din pool
async function tranzactie(pasi) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rezultat = await pasi(client);
    await client.query('COMMIT');
    return rezultat;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Eroare "de business" – mesajul ei se poate arăta utilizatorului
class EroareUtilizator extends Error {}

// ---------------------------------------------------------------------
// Plasarea unei comenzi din coșul clientului
//   1. blochează rândurile produselor (FOR UPDATE) și verifică stocul
//   2. creează comanda (numărul TG-AAAA-NNNNN e generat din secvență)
//   3. copiază produsele în detalii_comanda, cu prețul de acum
//   4. scade stocul și scrie mișcarea în miscari_stoc
//   5. calculează totalul și golește coșul
// ---------------------------------------------------------------------
async function plaseazaComanda(idUtilizator, livrare) {
  return tranzactie(async (client) => {
    const cos = await client.query(`
      SELECT cp.id_produs, cp.cantitate, p.nume, p.pret, p.stoc, p.activ
      FROM cosuri c
      JOIN cos_produse cp ON cp.id_cos = c.id_cos
      JOIN produse p      ON p.id_produs = cp.id_produs
      WHERE c.id_utilizator = $1
      ORDER BY cp.id_produs
      FOR UPDATE OF p`, [idUtilizator]);

    if (!cos.rowCount) throw new EroareUtilizator('Coșul este gol.');
    for (const r of cos.rows) {
      if (!r.activ) throw new EroareUtilizator(`Produsul „${r.nume}” nu mai este disponibil.`);
      if (r.cantitate > r.stoc) throw new EroareUtilizator(`Stoc insuficient pentru „${r.nume}” (mai sunt ${r.stoc} buc.).`);
    }

    const subtotal = cos.rows.reduce((s, r) => s + Number(r.pret) * r.cantitate, 0);
    const transport = subtotal >= PRAG_TRANSPORT_GRATUIT ? 0 : COST_TRANSPORT;

    const comanda = await client.query(`
      WITH n AS (SELECT nextval(pg_get_serial_sequence('comenzi', 'id_comanda')) AS id)
      INSERT INTO comenzi (id_comanda, id_utilizator, numar_comanda, metoda_plata, cost_transport,
                           adresa_livrare, oras_livrare, judet_livrare, telefon_contact, observatii)
      SELECT n.id, $1, 'TG-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(n.id::text, 5, '0'),
             $2, $3, $4, $5, $6, $7, $8
      FROM n
      RETURNING id_comanda, numar_comanda`,
      [idUtilizator, livrare.metoda_plata, transport, livrare.adresa, livrare.oras,
       livrare.judet, livrare.telefon, livrare.observatii || null]);
    const { id_comanda, numar_comanda } = comanda.rows[0];

    for (const r of cos.rows) {
      await client.query(`
        INSERT INTO detalii_comanda (id_comanda, id_produs, cantitate, pret_unitar)
        VALUES ($1, $2, $3, $4)`, [id_comanda, r.id_produs, r.cantitate, r.pret]);
      await client.query('UPDATE produse SET stoc = stoc - $1 WHERE id_produs = $2', [r.cantitate, r.id_produs]);
      await client.query(`
        INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv)
        VALUES ($1, $2, $3, 'iesire', $4, $5)`,
        [r.id_produs, idUtilizator, id_comanda, -r.cantitate, `Comanda ${numar_comanda}`]);
    }

    await client.query(`
      UPDATE comenzi
      SET total = cost_transport + (SELECT SUM(cantitate * pret_unitar) FROM detalii_comanda WHERE id_comanda = $1)
      WHERE id_comanda = $1`, [id_comanda]);

    await client.query(`
      DELETE FROM cos_produse WHERE id_cos = (SELECT id_cos FROM cosuri WHERE id_utilizator = $1)`, [idUtilizator]);

    return { id_comanda, numar_comanda };
  });
}

// ---------------------------------------------------------------------
// Schimbarea statusului unei comenzi. La anulare, produsele revin în
// stoc și se scrie o mișcare de tip "retur" pentru fiecare.
// ---------------------------------------------------------------------
async function schimbaStatusComanda(idComanda, statusNou, idUtilizator) {
  return tranzactie(async (client) => {
    const { rows } = await client.query(
      'SELECT status, numar_comanda FROM comenzi WHERE id_comanda = $1 FOR UPDATE', [idComanda]);
    if (!rows.length) throw new EroareUtilizator('Comanda nu există.');
    const { status, numar_comanda } = rows[0];

    if (status === 'anulata') throw new EroareUtilizator('Comanda este deja anulată.');
    if (status === 'livrata' && statusNou === 'anulata') throw new EroareUtilizator('O comandă livrată nu mai poate fi anulată.');

    if (statusNou === 'anulata') {
      const produse = await client.query(
        'SELECT id_produs, cantitate FROM detalii_comanda WHERE id_comanda = $1', [idComanda]);
      for (const p of produse.rows) {
        await client.query('UPDATE produse SET stoc = stoc + $1 WHERE id_produs = $2', [p.cantitate, p.id_produs]);
        await client.query(`
          INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv)
          VALUES ($1, $2, $3, 'retur', $4, $5)`,
          [p.id_produs, idUtilizator, idComanda, p.cantitate, `Anulare comanda ${numar_comanda}`]);
      }
    }
    await client.query('UPDATE comenzi SET status = $1 WHERE id_comanda = $2', [statusNou, idComanda]);
  });
}

// ---------------------------------------------------------------------
// Mișcare manuală de stoc (recepție marfă / corecție inventar)
// ---------------------------------------------------------------------
async function miscareStoc(idProdus, tip, cantitate, motiv, idUtilizator) {
  return tranzactie(async (client) => {
    const { rows } = await client.query('SELECT stoc FROM produse WHERE id_produs = $1 FOR UPDATE', [idProdus]);
    if (!rows.length) throw new EroareUtilizator('Produsul nu există.');
    if (rows[0].stoc + cantitate < 0) throw new EroareUtilizator(`Stocul nu poate deveni negativ (stoc actual: ${rows[0].stoc}).`);

    await client.query('UPDATE produse SET stoc = stoc + $1 WHERE id_produs = $2', [cantitate, idProdus]);
    await client.query(`
      INSERT INTO miscari_stoc (id_produs, id_utilizator, tip_miscare, cantitate, motiv)
      VALUES ($1, $2, $3, $4, $5)`, [idProdus, idUtilizator, tip, cantitate, motiv || null]);
  });
}

// ---------------------------------------------------------------------
// Cerere de service nouă (+ primul rând în istoric_service)
// ---------------------------------------------------------------------
async function creeazaCerereService(idClient, d) {
  return tranzactie(async (client) => {
    const { rows } = await client.query(`
      WITH n AS (SELECT nextval(pg_get_serial_sequence('cereri_service', 'id_cerere')) AS id)
      INSERT INTO cereri_service (id_cerere, numar_cerere, id_client, id_serviciu, tip_dispozitiv,
                                  marca_dispozitiv, model_dispozitiv, serie_dispozitiv, descriere_problema)
      SELECT n.id, 'SRV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(n.id::text, 5, '0'),
             $1, $2, $3, $4, $5, $6, $7
      FROM n
      RETURNING id_cerere, numar_cerere`,
      [idClient, d.id_serviciu, d.tip_dispozitiv, d.marca_dispozitiv, d.model_dispozitiv || null,
       d.serie_dispozitiv || null, d.descriere_problema]);

    await client.query(`
      INSERT INTO istoric_service (id_cerere, id_utilizator, status_nou, comentariu)
      VALUES ($1, $2, 'inregistrata', 'Cerere depusă online de client.')`, [rows[0].id_cerere, idClient]);
    return rows[0];
  });
}

// ---------------------------------------------------------------------
// Actualizarea unei cereri de service de către angajat
// (dacă se schimbă statusul, se adaugă un rând în istoric_service)
// ---------------------------------------------------------------------
async function actualizeazaCerereService(idCerere, d, idUtilizator) {
  return tranzactie(async (client) => {
    const { rows } = await client.query('SELECT status FROM cereri_service WHERE id_cerere = $1 FOR UPDATE', [idCerere]);
    if (!rows.length) throw new EroareUtilizator('Cererea nu există.');
    const statusVechi = rows[0].status;

    await client.query(`
      UPDATE cereri_service
      SET id_angajat = $1, status = $2::varchar, cost_estimat = $3, cost_final = $4,
          data_finalizare = CASE WHEN $2::varchar IN ('finalizata', 'predata') THEN COALESCE(data_finalizare, NOW()) ELSE NULL END
      WHERE id_cerere = $5`,
      [d.id_angajat || null, d.status, d.cost_estimat || null, d.cost_final || null, idCerere]);

    if (d.status !== statusVechi || (d.comentariu && d.comentariu.trim())) {
      await client.query(`
        INSERT INTO istoric_service (id_cerere, id_utilizator, status_nou, comentariu)
        VALUES ($1, $2, $3, $4)`, [idCerere, idUtilizator, d.status, d.comentariu || null]);
    }
  });
}

module.exports = {
  tranzactie, EroareUtilizator, plaseazaComanda, schimbaStatusComanda, miscareStoc,
  creeazaCerereService, actualizeazaCerereService, PRAG_TRANSPORT_GRATUIT, COST_TRANSPORT,
};
