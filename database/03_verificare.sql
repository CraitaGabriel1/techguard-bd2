-- =====================================================================
--  TECHGUARD – Etapa 1: Interogări de verificare / demonstrație
--  Fișier: 03_verificare.sql  →  se rulează după 01 și 02
-- =====================================================================

SET client_encoding = 'UTF8';

\echo '=== 1. Numărul de rânduri din fiecare tabel ==='
SELECT 'roluri' AS tabel, COUNT(*) AS randuri FROM roluri
UNION ALL SELECT 'utilizatori',     COUNT(*) FROM utilizatori
UNION ALL SELECT 'categorii',       COUNT(*) FROM categorii
UNION ALL SELECT 'marci',           COUNT(*) FROM marci
UNION ALL SELECT 'produse',         COUNT(*) FROM produse
UNION ALL SELECT 'cosuri',          COUNT(*) FROM cosuri
UNION ALL SELECT 'cos_produse',     COUNT(*) FROM cos_produse
UNION ALL SELECT 'comenzi',         COUNT(*) FROM comenzi
UNION ALL SELECT 'detalii_comanda', COUNT(*) FROM detalii_comanda
UNION ALL SELECT 'miscari_stoc',    COUNT(*) FROM miscari_stoc
UNION ALL SELECT 'servicii',        COUNT(*) FROM servicii
UNION ALL SELECT 'cereri_service',  COUNT(*) FROM cereri_service
UNION ALL SELECT 'istoric_service', COUNT(*) FROM istoric_service;

\echo '=== 2. Utilizatori și rolurile lor (relația 1:N roluri → utilizatori) ==='
SELECT u.id_utilizator, u.prenume || ' ' || u.nume AS utilizator, u.email, r.nume_rol, u.activ
FROM   utilizatori u JOIN roluri r ON r.id_rol = u.id_rol
ORDER  BY r.id_rol DESC, u.id_utilizator;

\echo '=== 3. Arborele de categorii (relația recursivă) ==='
SELECT p.nume AS categorie, c.nume AS subcategorie,
       (SELECT COUNT(*) FROM produse pr WHERE pr.id_categorie = c.id_categorie) AS nr_produse
FROM   categorii c JOIN categorii p ON p.id_categorie = c.id_parinte
ORDER  BY p.id_categorie, c.id_categorie;

\echo '=== 4. Catalog: produse cu categorie și marcă ==='
SELECT pr.cod_produs, pr.nume, c.nume AS subcategorie, m.nume AS marca, pr.pret, pr.stoc
FROM   produse pr
JOIN   categorii c ON c.id_categorie = pr.id_categorie
JOIN   marci m     ON m.id_marca     = pr.id_marca
WHERE  pr.activ
ORDER  BY c.id_categorie, pr.pret DESC;

\echo '=== 5. Căutare în specificațiile JSONB: plăci video cu cel puțin 12 GB ==='
SELECT nume, specificatii->>'chipset' AS chipset, (specificatii->>'memorie_gb')::int AS memorie_gb, pret
FROM   produse
WHERE  id_categorie = 8 AND (specificatii->>'memorie_gb')::int >= 12 AND activ;

\echo '=== 6. Coșurile clienților (1:1 utilizator–coș, N:M coș–produse) ==='
SELECT u.prenume || ' ' || u.nume AS client, p.nume AS produs, cp.cantitate,
       p.pret * cp.cantitate AS valoare
FROM   cosuri c
JOIN   utilizatori u  ON u.id_utilizator = c.id_utilizator
JOIN   cos_produse cp ON cp.id_cos = c.id_cos
JOIN   produse p      ON p.id_produs = cp.id_produs
ORDER  BY client;

\echo '=== 7. Comenzile, cu numărul de produse și totalul ==='
SELECT c.numar_comanda, c.data_comanda::date AS data, u.prenume || ' ' || u.nume AS client,
       c.status, c.metoda_plata, SUM(d.cantitate) AS nr_produse, c.total
FROM   comenzi c
JOIN   utilizatori u     ON u.id_utilizator = c.id_utilizator
JOIN   detalii_comanda d ON d.id_comanda = c.id_comanda
GROUP  BY c.id_comanda, u.prenume, u.nume
ORDER  BY c.data_comanda;

\echo '=== 8. Prețul de la cumpărare vs. prețul actual (de ce copiem prețul) ==='
SELECT c.numar_comanda, p.nume, d.pret_unitar AS pret_platit, p.pret AS pret_actual
FROM   detalii_comanda d
JOIN   comenzi c ON c.id_comanda = d.id_comanda
JOIN   produse p ON p.id_produs  = d.id_produs
WHERE  d.pret_unitar <> p.pret;

\echo '=== 9. Verificare consistență: stocul curent = suma mișcărilor de stoc (trebuie 0 rânduri) ==='
SELECT p.id_produs, p.nume, p.stoc, COALESCE(SUM(m.cantitate),0) AS suma_miscari
FROM   produse p LEFT JOIN miscari_stoc m ON m.id_produs = p.id_produs
GROUP  BY p.id_produs
HAVING p.stoc <> COALESCE(SUM(m.cantitate),0);

\echo '=== 10. Verificare consistență: totalul comenzii = produse + transport (trebuie 0 rânduri) ==='
SELECT c.numar_comanda, c.total, SUM(d.cantitate*d.pret_unitar) + c.cost_transport AS recalculat
FROM   comenzi c JOIN detalii_comanda d ON d.id_comanda = c.id_comanda
GROUP  BY c.id_comanda
HAVING c.total <> SUM(d.cantitate*d.pret_unitar) + c.cost_transport;

\echo '=== 11. Cereri de service: client, angajat (două FK spre utilizatori), serviciu ==='
SELECT s.numar_cerere, cl.prenume || ' ' || cl.nume AS client,
       COALESCE(an.prenume || ' ' || an.nume, '— nepreluată —') AS angajat,
       sv.nume AS serviciu, s.tip_dispozitiv, s.marca_dispozitiv, s.status, s.cost_final
FROM   cereri_service s
JOIN   utilizatori cl ON cl.id_utilizator = s.id_client
LEFT JOIN utilizatori an ON an.id_utilizator = s.id_angajat
JOIN   servicii sv ON sv.id_serviciu = s.id_serviciu
ORDER  BY s.data_cerere;

\echo '=== 12. Cronologia unei reparații (cererea SRV-2026-00002) ==='
SELECT i.data_modificare, i.status_nou, u.prenume || ' ' || u.nume AS modificat_de, i.comentariu
FROM   istoric_service i
JOIN   utilizatori u ON u.id_utilizator = i.id_utilizator
WHERE  i.id_cerere = 2
ORDER  BY i.data_modificare;

\echo '=== 13. Verificare consistență: status cerere = ultimul status din istoric (trebuie 0 rânduri) ==='
SELECT s.numar_cerere, s.status, ultim.status_nou
FROM   cereri_service s
JOIN LATERAL (SELECT status_nou FROM istoric_service i
              WHERE i.id_cerere = s.id_cerere
              ORDER BY data_modificare DESC LIMIT 1) ultim ON TRUE
WHERE  s.status <> ultim.status_nou;

\echo '=== 14. Test constrângeri: aceste comenzi TREBUIE să dea eroare ==='
\set ON_ERROR_STOP off
INSERT INTO produse (id_categorie, id_marca, cod_produs, nume, pret) VALUES (8, 3, 'TEST-1', 'Test preț negativ', -10);
INSERT INTO utilizatori (id_rol, nume, prenume, email, parola_hash) VALUES (1, 'Test', 'Dublura', 'admin@techguard.ro', 'x');
INSERT INTO comenzi (id_utilizator, numar_comanda, status, metoda_plata, adresa_livrare, oras_livrare, judet_livrare, telefon_contact)
       VALUES (4, 'TEST-1', 'trimisa', 'card', 'x', 'x', 'x', 'x');
INSERT INTO produse (id_categorie, id_marca, cod_produs, nume, pret) VALUES (999, 3, 'TEST-2', 'Test categorie inexistentă', 10);
DELETE FROM marci WHERE id_marca = 3;
\set ON_ERROR_STOP on
