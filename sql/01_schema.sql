-- =====================================================================
--  TECHGUARD – Magazin online IT & Gaming
--  Proiect Baze de Date Avansate – Etapa 1: Modelare
--  Fișier: 01_schema.sql  →  creează cele 13 tabele
--  Rulare: psql -U postgres -d techguard -f 01_schema.sql
-- =====================================================================

SET client_encoding = 'UTF8';

-- Ștergem tabelele dacă există deja (ca scriptul să poată fi rulat de mai multe ori).
-- Ordinea este inversă creării, din cauza cheilor străine.
DROP TABLE IF EXISTS istoric_service  CASCADE;
DROP TABLE IF EXISTS cereri_service   CASCADE;
DROP TABLE IF EXISTS servicii         CASCADE;
DROP TABLE IF EXISTS miscari_stoc     CASCADE;
DROP TABLE IF EXISTS detalii_comanda  CASCADE;
DROP TABLE IF EXISTS comenzi          CASCADE;
DROP TABLE IF EXISTS cos_produse      CASCADE;
DROP TABLE IF EXISTS cosuri           CASCADE;
DROP TABLE IF EXISTS produse          CASCADE;
DROP TABLE IF EXISTS marci            CASCADE;
DROP TABLE IF EXISTS categorii        CASCADE;
DROP TABLE IF EXISTS utilizatori      CASCADE;
DROP TABLE IF EXISTS roluri           CASCADE;


-- ---------------------------------------------------------------------
-- 1. ROLURI – Client, Angajat, Administrator
--    (Vizitatorul = utilizator neautentificat, nu are rând aici)
-- ---------------------------------------------------------------------
CREATE TABLE roluri (
    id_rol      SERIAL       PRIMARY KEY,
    nume_rol    VARCHAR(30)  NOT NULL UNIQUE,
    descriere   TEXT
);


-- ---------------------------------------------------------------------
-- 2. UTILIZATORI – conturile clienților, angajaților și administratorilor
-- ---------------------------------------------------------------------
CREATE TABLE utilizatori (
    id_utilizator      SERIAL        PRIMARY KEY,
    id_rol             INT           NOT NULL
                       REFERENCES roluri(id_rol) ON DELETE RESTRICT,
    nume               VARCHAR(50)   NOT NULL,
    prenume            VARCHAR(50)   NOT NULL,
    email              VARCHAR(100)  NOT NULL UNIQUE,
    parola_hash        VARCHAR(255)  NOT NULL,
    telefon            VARCHAR(15),
    adresa             VARCHAR(255),
    oras               VARCHAR(50),
    judet              VARCHAR(50),
    activ              BOOLEAN       NOT NULL DEFAULT TRUE,
    data_inregistrare  TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 3. CATEGORII – categorii și subcategorii (relație recursivă)
--    id_parinte = NULL → categorie principală
-- ---------------------------------------------------------------------
CREATE TABLE categorii (
    id_categorie  SERIAL        PRIMARY KEY,
    id_parinte    INT
                  REFERENCES categorii(id_categorie) ON DELETE RESTRICT,
    nume          VARCHAR(80)   NOT NULL,
    slug          VARCHAR(100)  NOT NULL UNIQUE,
    descriere     TEXT,
    CONSTRAINT ck_categorii_parinte CHECK (id_parinte IS NULL OR id_parinte <> id_categorie)
);


-- ---------------------------------------------------------------------
-- 4. MARCI – producători / mărci
-- ---------------------------------------------------------------------
CREATE TABLE marci (
    id_marca      SERIAL        PRIMARY KEY,
    nume          VARCHAR(60)   NOT NULL UNIQUE,
    tara_origine  VARCHAR(50),
    website       VARCHAR(150)
);


-- ---------------------------------------------------------------------
-- 5. PRODUSE
-- ---------------------------------------------------------------------
CREATE TABLE produse (
    id_produs      SERIAL         PRIMARY KEY,
    id_categorie   INT            NOT NULL
                   REFERENCES categorii(id_categorie) ON DELETE RESTRICT,
    id_marca       INT            NOT NULL
                   REFERENCES marci(id_marca) ON DELETE RESTRICT,
    cod_produs     VARCHAR(30)    NOT NULL UNIQUE,
    nume           VARCHAR(150)   NOT NULL,
    descriere      TEXT,
    pret           NUMERIC(10,2)  NOT NULL CHECK (pret >= 0),
    stoc           INT            NOT NULL DEFAULT 0 CHECK (stoc >= 0),
    garantie_luni  SMALLINT       NOT NULL DEFAULT 24 CHECK (garantie_luni >= 0),
    imagine_url    VARCHAR(255),
    specificatii   JSONB,
    activ          BOOLEAN        NOT NULL DEFAULT TRUE,
    data_adaugare  TIMESTAMP      NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 6. COSURI – un singur coș per client (relație 1:1 prin UNIQUE)
-- ---------------------------------------------------------------------
CREATE TABLE cosuri (
    id_cos            SERIAL     PRIMARY KEY,
    id_utilizator     INT        NOT NULL UNIQUE
                      REFERENCES utilizatori(id_utilizator) ON DELETE CASCADE,
    data_creare       TIMESTAMP  NOT NULL DEFAULT NOW(),
    data_actualizare  TIMESTAMP  NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 7. COS_PRODUSE – legătură N:M între cosuri și produse
-- ---------------------------------------------------------------------
CREATE TABLE cos_produse (
    id_cos         INT        NOT NULL
                   REFERENCES cosuri(id_cos) ON DELETE CASCADE,
    id_produs      INT        NOT NULL
                   REFERENCES produse(id_produs) ON DELETE RESTRICT,
    cantitate      INT        NOT NULL CHECK (cantitate > 0),
    data_adaugare  TIMESTAMP  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_cos, id_produs)              -- cheie primară compusă
);


-- ---------------------------------------------------------------------
-- 8. COMENZI
-- ---------------------------------------------------------------------
CREATE TABLE comenzi (
    id_comanda       SERIAL         PRIMARY KEY,
    id_utilizator    INT            NOT NULL
                     REFERENCES utilizatori(id_utilizator) ON DELETE RESTRICT,
    numar_comanda    VARCHAR(20)    NOT NULL UNIQUE,
    data_comanda     TIMESTAMP      NOT NULL DEFAULT NOW(),
    status           VARCHAR(20)    NOT NULL DEFAULT 'plasata'
                     CHECK (status IN ('plasata','procesata','expediata','livrata','anulata')),
    metoda_plata     VARCHAR(20)    NOT NULL
                     CHECK (metoda_plata IN ('card','ramburs','transfer')),
    cost_transport   NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (cost_transport >= 0),
    total            NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (total >= 0),
    adresa_livrare   VARCHAR(255)   NOT NULL,
    oras_livrare     VARCHAR(50)    NOT NULL,
    judet_livrare    VARCHAR(50)    NOT NULL,
    telefon_contact  VARCHAR(15)    NOT NULL,
    observatii       TEXT
);


-- ---------------------------------------------------------------------
-- 9. DETALII_COMANDA – legătură N:M între comenzi și produse
--    pret_unitar = prețul de la momentul cumpărării
-- ---------------------------------------------------------------------
CREATE TABLE detalii_comanda (
    id_comanda   INT            NOT NULL
                 REFERENCES comenzi(id_comanda) ON DELETE RESTRICT,
    id_produs    INT            NOT NULL
                 REFERENCES produse(id_produs) ON DELETE RESTRICT,
    cantitate    INT            NOT NULL CHECK (cantitate > 0),
    pret_unitar  NUMERIC(10,2)  NOT NULL CHECK (pret_unitar >= 0),
    PRIMARY KEY (id_comanda, id_produs)          -- cheie primară compusă
);


-- ---------------------------------------------------------------------
-- 10. MISCARI_STOC – istoricul modificărilor de stoc
--     cantitate > 0 = intrare în stoc, cantitate < 0 = ieșire din stoc
-- ---------------------------------------------------------------------
CREATE TABLE miscari_stoc (
    id_miscare     SERIAL        PRIMARY KEY,
    id_produs      INT           NOT NULL
                   REFERENCES produse(id_produs) ON DELETE RESTRICT,
    id_utilizator  INT
                   REFERENCES utilizatori(id_utilizator) ON DELETE SET NULL,
    id_comanda     INT
                   REFERENCES comenzi(id_comanda) ON DELETE RESTRICT,
    tip_miscare    VARCHAR(20)   NOT NULL
                   CHECK (tip_miscare IN ('intrare','iesire','corectie','retur')),
    cantitate      INT           NOT NULL CHECK (cantitate <> 0),
    motiv          VARCHAR(255),
    data_miscare   TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 11. SERVICII – lista serviciilor de mentenanță și reparații
-- ---------------------------------------------------------------------
CREATE TABLE servicii (
    id_serviciu           SERIAL         PRIMARY KEY,
    nume                  VARCHAR(100)   NOT NULL UNIQUE,
    descriere             TEXT,
    pret_estimativ        NUMERIC(10,2)  CHECK (pret_estimativ >= 0),
    durata_estimata_zile  SMALLINT       CHECK (durata_estimata_zile > 0),
    activ                 BOOLEAN        NOT NULL DEFAULT TRUE
);


-- ---------------------------------------------------------------------
-- 12. CERERI_SERVICE – cererile de service ale clienților
--     id_client și id_angajat → ambele spre utilizatori
-- ---------------------------------------------------------------------
CREATE TABLE cereri_service (
    id_cerere           SERIAL         PRIMARY KEY,
    numar_cerere        VARCHAR(20)    NOT NULL UNIQUE,
    id_client           INT            NOT NULL
                        REFERENCES utilizatori(id_utilizator) ON DELETE RESTRICT,
    id_angajat          INT
                        REFERENCES utilizatori(id_utilizator) ON DELETE SET NULL,
    id_serviciu         INT            NOT NULL
                        REFERENCES servicii(id_serviciu) ON DELETE RESTRICT,
    tip_dispozitiv      VARCHAR(20)    NOT NULL
                        CHECK (tip_dispozitiv IN ('calculator','laptop','consola','periferic')),
    marca_dispozitiv    VARCHAR(60)    NOT NULL,
    model_dispozitiv    VARCHAR(100),
    serie_dispozitiv    VARCHAR(50),
    descriere_problema  TEXT           NOT NULL,
    status              VARCHAR(20)    NOT NULL DEFAULT 'inregistrata'
                        CHECK (status IN ('inregistrata','in_lucru','finalizata','predata')),
    cost_estimat        NUMERIC(10,2)  CHECK (cost_estimat >= 0),
    cost_final          NUMERIC(10,2)  CHECK (cost_final >= 0),
    data_cerere         TIMESTAMP      NOT NULL DEFAULT NOW(),
    data_finalizare     TIMESTAMP,
    CONSTRAINT ck_cereri_date CHECK (data_finalizare IS NULL OR data_finalizare >= data_cerere)
);


-- ---------------------------------------------------------------------
-- 13. ISTORIC_SERVICE – cronologia stadiilor unei reparații
-- ---------------------------------------------------------------------
CREATE TABLE istoric_service (
    id_istoric       SERIAL        PRIMARY KEY,
    id_cerere        INT           NOT NULL
                     REFERENCES cereri_service(id_cerere) ON DELETE CASCADE,
    id_utilizator    INT           NOT NULL
                     REFERENCES utilizatori(id_utilizator) ON DELETE RESTRICT,
    status_nou       VARCHAR(20)   NOT NULL
                     CHECK (status_nou IN ('inregistrata','in_lucru','finalizata','predata')),
    comentariu       TEXT,
    data_modificare  TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- Comentarii pe tabele (apar în pgAdmin și în documentația generată)
-- ---------------------------------------------------------------------
COMMENT ON TABLE roluri          IS 'Rolurile utilizatorilor autentificați: Client, Angajat, Administrator';
COMMENT ON TABLE utilizatori     IS 'Conturile utilizatorilor';
COMMENT ON TABLE categorii       IS 'Categorii și subcategorii de produse (relație recursivă)';
COMMENT ON TABLE marci           IS 'Producători / mărci';
COMMENT ON TABLE produse         IS 'Produsele magazinului; specificațiile tehnice în JSONB';
COMMENT ON TABLE cosuri          IS 'Coșul de cumpărături al fiecărui client (1:1)';
COMMENT ON TABLE cos_produse     IS 'Produsele din coș (N:M)';
COMMENT ON TABLE comenzi         IS 'Comenzile plasate';
COMMENT ON TABLE detalii_comanda IS 'Produsele din comandă, cu prețul de la cumpărare (N:M)';
COMMENT ON TABLE miscari_stoc    IS 'Istoricul intrărilor și ieșirilor de stoc';
COMMENT ON TABLE servicii        IS 'Lista serviciilor de mentenanță și reparații';
COMMENT ON TABLE cereri_service  IS 'Cererile de service ale clienților';
COMMENT ON TABLE istoric_service IS 'Cronologia stadiilor fiecărei reparații';
