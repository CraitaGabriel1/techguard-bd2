-- =====================================================================
--  TECHGUARD – Etapa 1: Date de test (fixtures)
--  Fișier: 02_date_test.sql  →  se rulează DUPĂ 01_schema.sql
--  Parola tuturor conturilor de test: Parola123!  (salvată criptat, bcrypt)
-- =====================================================================

SET client_encoding = 'UTF8';

BEGIN;   -- totul într-o singură tranzacție: ori intră toate datele, ori niciuna

-- ---------------------------------------------------------------------
-- ROLURI
-- ---------------------------------------------------------------------
INSERT INTO roluri (id_rol, nume_rol, descriere) VALUES
(1, 'Client',        'Coș, comenzi, istoric comenzi, cereri de service, gestionarea contului'),
(2, 'Angajat',       'Gestionează produse, stocuri, comenzi și cereri de service; generează rapoarte'),
(3, 'Administrator', 'Toate permisiunile, plus categorii, utilizatori și roluri');

-- ---------------------------------------------------------------------
-- UTILIZATORI  (1 administrator, 2 angajați, 7 clienți)
-- ---------------------------------------------------------------------
INSERT INTO utilizatori (id_utilizator, id_rol, nume, prenume, email, parola_hash, telefon, adresa, oras, judet, activ, data_inregistrare) VALUES
(1,  3, 'Crăița',    'Gabriel',  'admin@techguard.ro',            '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0740000001', 'Str. Domnească 47',          'Galați',    'Galați',    TRUE,  '2026-09-01 09:00'),
(2,  2, 'Popa',      'Andrei',   'andrei.popa@techguard.ro',      '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0740000002', 'Str. Brăilei 120',           'Galați',    'Galați',    TRUE,  '2026-09-01 09:30'),
(3,  2, 'Stan',      'Elena',    'elena.stan@techguard.ro',       '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0740000003', 'Str. Traian 15',             'Galați',    'Galați',    TRUE,  '2026-09-02 10:00'),
(4,  1, 'Ionescu',   'Mihai',    'mihai.ionescu@gmail.com',       '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0722111222', 'Bd. Unirii 21, bl. A3, ap. 12', 'București', 'București', TRUE,  '2026-09-10 18:22'),
(5,  1, 'Dumitrescu','Ana',      'ana.dumitrescu@yahoo.com',      '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0733222333', 'Str. Lăpușneanu 8',          'Iași',      'Iași',      TRUE,  '2026-09-14 12:05'),
(6,  1, 'Marin',     'Vlad',     'vlad.marin@gmail.com',          '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0744333444', 'Str. Memorandumului 30',     'Cluj-Napoca','Cluj',     TRUE,  '2026-09-20 21:40'),
(7,  1, 'Georgescu', 'Ioana',    'ioana.georgescu@gmail.com',     '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0755444555', 'Str. Republicii 64',         'Brăila',    'Brăila',    TRUE,  '2026-10-01 08:15'),
(8,  1, 'Radu',      'Cristian', 'cristian.radu@outlook.com',     '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0766555666', 'Str. Tomis 102',             'Constanța', 'Constanța', TRUE,  '2026-10-05 16:50'),
(9,  1, 'Neagu',     'Bianca',   'bianca.neagu@gmail.com',        '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0777666777', 'Str. Gării 5',               'Galați',    'Galați',    TRUE,  '2026-10-18 11:30'),
(10, 1, 'Toma',      'Alexandru','alex.toma@gmail.com',           '$2b$10$VI2i94OmcLwhA97Qn/7SmewZqs6/axa7CZJMfrn4QMTWTDb6/njW.', '0788777888', 'Str. Avram Iancu 3',         'Timișoara', 'Timiș',     FALSE, '2026-10-25 19:00');  -- cont blocat (exemplu)

-- ---------------------------------------------------------------------
-- CATEGORII  (6 principale + subcategorii)
-- ---------------------------------------------------------------------
INSERT INTO categorii (id_categorie, id_parinte, nume, slug, descriere) VALUES
(1,  NULL, 'Componente PC',             'componente-pc',            'Tot ce îți trebuie pentru a-ți construi sau upgrada calculatorul'),
(2,  NULL, 'Calculatoare și laptopuri', 'calculatoare-laptopuri',   'Sisteme desktop și laptopuri pentru gaming și birou'),
(3,  NULL, 'Console',                   'console',                  'Console PlayStation, Xbox și Nintendo'),
(4,  NULL, 'Periferice',                'periferice',               'Tastaturi, mouse-uri, căști, monitoare și controllere'),
(5,  NULL, 'Jocuri video',              'jocuri-video',             'Jocuri pentru PC și console'),
(6,  NULL, 'Accesorii',                 'accesorii',                'Cabluri, răcire și alte accesorii IT'),
-- Componente PC
(7,  1, 'Procesoare',       'procesoare',        NULL),
(8,  1, 'Plăci video',      'placi-video',       NULL),
(9,  1, 'Memorii RAM',      'memorii-ram',       NULL),
(10, 1, 'SSD-uri',          'ssd',               NULL),
(11, 1, 'HDD-uri',          'hdd',               NULL),
(12, 1, 'Plăci de bază',    'placi-de-baza',     NULL),
(13, 1, 'Surse',            'surse',             NULL),
-- Calculatoare și laptopuri
(14, 2, 'Laptopuri gaming', 'laptopuri-gaming',  NULL),
(15, 2, 'Laptopuri office', 'laptopuri-office',  NULL),
(16, 2, 'Desktop gaming',   'desktop-gaming',    NULL),
-- Console
(17, 3, 'PlayStation',      'playstation',       NULL),
(18, 3, 'Xbox',             'xbox',              NULL),
(19, 3, 'Nintendo',         'nintendo',          NULL),
-- Periferice
(20, 4, 'Tastaturi',        'tastaturi',         NULL),
(21, 4, 'Mouse-uri',        'mouse-uri',         NULL),
(22, 4, 'Căști',            'casti',             NULL),
(23, 4, 'Monitoare',        'monitoare',         NULL),
(24, 4, 'Controllere',      'controllere',       NULL),
-- Jocuri video
(25, 5, 'Jocuri PC',        'jocuri-pc',         NULL),
(26, 5, 'Jocuri PlayStation','jocuri-playstation',NULL),
(27, 5, 'Jocuri Nintendo',  'jocuri-nintendo',   NULL),
-- Accesorii
(28, 6, 'Răcire și pastă termică', 'racire-pasta-termica', NULL),
(29, 6, 'Cabluri și adaptoare',    'cabluri-adaptoare',    NULL);

-- ---------------------------------------------------------------------
-- MARCI
-- ---------------------------------------------------------------------
INSERT INTO marci (id_marca, nume, tara_origine, website) VALUES
(1,  'AMD',             'SUA',            'https://www.amd.com'),
(2,  'Intel',           'SUA',            'https://www.intel.com'),
(3,  'ASUS',            'Taiwan',         'https://www.asus.com'),
(4,  'MSI',             'Taiwan',         'https://www.msi.com'),
(5,  'Gigabyte',        'Taiwan',         'https://www.gigabyte.com'),
(6,  'Kingston',        'SUA',            'https://www.kingston.com'),
(7,  'Corsair',         'SUA',            'https://www.corsair.com'),
(8,  'Samsung',         'Coreea de Sud',  'https://www.samsung.com'),
(9,  'Western Digital', 'SUA',            'https://www.westerndigital.com'),
(10, 'Seagate',         'SUA',            'https://www.seagate.com'),
(11, 'Seasonic',        'Taiwan',         'https://seasonic.com'),
(12, 'Lenovo',          'China',          'https://www.lenovo.com'),
(13, 'Acer',            'Taiwan',         'https://www.acer.com'),
(14, 'Sony',            'Japonia',        'https://www.playstation.com'),
(15, 'Microsoft',       'SUA',            'https://www.xbox.com'),
(16, 'Nintendo',        'Japonia',        'https://www.nintendo.com'),
(17, 'Logitech',        'Elveția',        'https://www.logitechg.com'),
(18, 'Razer',           'Singapore',      'https://www.razer.com'),
(19, 'HyperX',          'SUA',            'https://hyperx.com'),
(20, 'LG',              'Coreea de Sud',  'https://www.lg.com'),
(21, 'Arctic',          'Elveția',        'https://www.arctic.de'),
(22, 'CD Projekt Red',  'Polonia',        'https://www.cdprojektred.com'),
(23, 'Ugreen',          'China',          'https://www.ugreen.com');

-- ---------------------------------------------------------------------
-- PRODUSE  (stoc = stocul curent; istoricul este în miscari_stoc)
-- ---------------------------------------------------------------------
INSERT INTO produse (id_produs, id_categorie, id_marca, cod_produs, nume, descriere, pret, stoc, garantie_luni, imagine_url, specificatii, activ, data_adaugare) VALUES
-- Procesoare
(1,  7, 1, 'TG-CPU-0001', 'Procesor AMD Ryzen 7 7800X3D', 'Procesor de gaming cu tehnologie 3D V-Cache', 1899.99, 12, 36, '/img/produse/ryzen-7-7800x3d.jpg',
     '{"socket":"AM5","nuclee":8,"fire":16,"frecventa_baza_ghz":4.2,"frecventa_boost_ghz":5.0,"cache_l3_mb":96,"tdp_w":120}', TRUE, '2026-09-01'),
(2,  7, 1, 'TG-CPU-0002', 'Procesor AMD Ryzen 5 7600', 'Procesor performant pentru gaming la preț accesibil', 999.99, 20, 36, '/img/produse/ryzen-5-7600.jpg',
     '{"socket":"AM5","nuclee":6,"fire":12,"frecventa_baza_ghz":3.8,"frecventa_boost_ghz":5.1,"cache_l3_mb":32,"tdp_w":65}', TRUE, '2026-09-01'),
(3,  7, 2, 'TG-CPU-0003', 'Procesor Intel Core i5-14600K', 'Procesor deblocat, ideal pentru gaming și productivitate', 1499.99, 9, 36, '/img/produse/i5-14600k.jpg',
     '{"socket":"LGA1700","nuclee":14,"fire":20,"frecventa_boost_ghz":5.3,"cache_l3_mb":24,"tdp_w":125}', TRUE, '2026-09-01'),
-- Plăci video
(4,  8, 3, 'TG-GPU-0001', 'Placă video ASUS Dual GeForce RTX 4070 SUPER 12GB', 'Placă video pentru gaming 1440p', 3399.99, 6, 36, '/img/produse/asus-rtx4070s.jpg',
     '{"chipset":"NVIDIA GeForce RTX 4070 SUPER","memorie_gb":12,"tip_memorie":"GDDR6X","interfata":"PCIe 4.0","alimentare":"1x 8-pin"}', TRUE, '2026-09-01'),
(5,  8, 4, 'TG-GPU-0002', 'Placă video MSI Radeon RX 7800 XT Gaming Trio 16GB', 'Placă video AMD cu 16 GB pentru 1440p', 2899.99, 7, 36, '/img/produse/msi-rx7800xt.jpg',
     '{"chipset":"AMD Radeon RX 7800 XT","memorie_gb":16,"tip_memorie":"GDDR6","interfata":"PCIe 4.0","alimentare":"2x 8-pin"}', TRUE, '2026-09-01'),
(6,  8, 5, 'TG-GPU-0003', 'Placă video Gigabyte GeForce RTX 4060 Eagle OC 8GB', 'Placă video eficientă pentru 1080p', 1549.99, 15, 36, '/img/produse/gigabyte-rtx4060.jpg',
     '{"chipset":"NVIDIA GeForce RTX 4060","memorie_gb":8,"tip_memorie":"GDDR6","interfata":"PCIe 4.0","alimentare":"1x 8-pin"}', TRUE, '2026-09-01'),
-- Memorii RAM
(7,  9, 6, 'TG-RAM-0001', 'Memorie Kingston FURY Beast 32GB (2x16GB) DDR5 6000MHz', 'Kit dual-channel DDR5 cu profil EXPO/XMP', 549.99, 30, 120, '/img/produse/kingston-fury-ddr5.jpg',
     '{"capacitate_gb":32,"tip":"DDR5","frecventa_mhz":6000,"latenta":"CL36","module":2}', TRUE, '2026-09-01'),
(8,  9, 7, 'TG-RAM-0002', 'Memorie Corsair Vengeance 16GB (2x8GB) DDR4 3200MHz', 'Kit DDR4 pentru sisteme de generație anterioară', 229.99, 25, 120, '/img/produse/corsair-vengeance-ddr4.jpg',
     '{"capacitate_gb":16,"tip":"DDR4","frecventa_mhz":3200,"latenta":"CL16","module":2}', TRUE, '2026-09-01'),
-- SSD / HDD
(9,  10, 8, 'TG-SSD-0001', 'SSD Samsung 990 PRO 1TB NVMe M.2', 'SSD PCIe 4.0 de top', 649.99, 18, 60, '/img/produse/samsung-990pro.jpg',
     '{"capacitate_gb":1000,"interfata":"PCIe 4.0 NVMe","format":"M.2 2280","citire_mb_s":7450,"scriere_mb_s":6900}', TRUE, '2026-09-01'),
(10, 10, 9, 'TG-SSD-0002', 'SSD WD Blue SN580 2TB NVMe M.2', 'SSD cu capacitate mare la preț bun', 699.99, 14, 60, '/img/produse/wd-sn580.jpg',
     '{"capacitate_gb":2000,"interfata":"PCIe 4.0 NVMe","format":"M.2 2280","citire_mb_s":4150,"scriere_mb_s":4150}', TRUE, '2026-09-01'),
(11, 11, 10,'TG-HDD-0001', 'HDD Seagate BarraCuda 2TB 7200rpm', 'Hard disk pentru stocare de date', 299.99, 10, 24, '/img/produse/seagate-barracuda.jpg',
     '{"capacitate_gb":2000,"interfata":"SATA III","format":"3.5\"","rpm":7200,"cache_mb":256}', TRUE, '2026-09-01'),
-- Plăci de bază / surse
(12, 12, 3, 'TG-MB-0001',  'Placă de bază ASUS TUF GAMING B650-PLUS WIFI', 'Placă de bază AM5 cu Wi-Fi 6', 1099.99, 8, 36, '/img/produse/asus-b650.jpg',
     '{"socket":"AM5","chipset":"B650","format":"ATX","memorie":"DDR5","sloturi_m2":2,"wifi":true}', TRUE, '2026-09-01'),
(13, 12, 4, 'TG-MB-0002',  'Placă de bază MSI PRO Z790-P WIFI', 'Placă de bază LGA1700 pentru Intel', 1199.99, 5, 36, '/img/produse/msi-z790p.jpg',
     '{"socket":"LGA1700","chipset":"Z790","format":"ATX","memorie":"DDR5","sloturi_m2":4,"wifi":true}', TRUE, '2026-09-01'),
(14, 13, 11,'TG-PSU-0001', 'Sursă Seasonic Focus GX-750 750W 80+ Gold', 'Sursă modulară, 10 ani garanție', 649.99, 11, 120, '/img/produse/seasonic-gx750.jpg',
     '{"putere_w":750,"certificare":"80+ Gold","modulara":"complet"}', TRUE, '2026-09-01'),
-- Laptopuri și desktop
(15, 14, 12,'TG-LAP-0001', 'Laptop Gaming Lenovo Legion 5 16" Ryzen 7 RTX 4060', 'Laptop de gaming cu ecran 165 Hz', 6499.99, 4, 24, '/img/produse/legion-5.jpg',
     '{"procesor":"AMD Ryzen 7 7840HS","placa_video":"RTX 4060 8GB","ram_gb":16,"stocare":"SSD 1TB","ecran":"16\" WQXGA 165Hz"}', TRUE, '2026-09-05'),
(16, 14, 13,'TG-LAP-0002', 'Laptop Gaming Acer Nitro V 15 i5 RTX 4050', 'Laptop de gaming accesibil', 4299.99, 6, 24, '/img/produse/acer-nitro-v.jpg',
     '{"procesor":"Intel Core i5-13420H","placa_video":"RTX 4050 6GB","ram_gb":16,"stocare":"SSD 512GB","ecran":"15.6\" FHD 144Hz"}', TRUE, '2026-09-05'),
(17, 15, 12,'TG-LAP-0003', 'Laptop Lenovo IdeaPad Slim 3 15" Ryzen 5', 'Laptop ușor pentru studiu și birou', 2499.99, 10, 24, '/img/produse/ideapad-slim3.jpg',
     '{"procesor":"AMD Ryzen 5 7520U","ram_gb":8,"stocare":"SSD 512GB","ecran":"15.6\" FHD"}', TRUE, '2026-09-05'),
(18, 16, 4, 'TG-PC-0001',  'Sistem Desktop Gaming TECHGUARD Ryzen 5 / RTX 4060', 'Sistem asamblat și testat în service-ul TECHGUARD', 4999.99, 3, 24, '/img/produse/tg-desktop.jpg',
     '{"procesor":"AMD Ryzen 5 7600","placa_video":"RTX 4060 8GB","ram_gb":32,"stocare":"SSD 1TB","sursa":"650W 80+ Gold"}', TRUE, '2026-09-10'),
-- Console
(19, 17, 14,'TG-CON-0001', 'Consolă Sony PlayStation 5 Slim Digital Edition', 'PS5 Slim fără unitate optică', 2299.99, 8, 24, '/img/produse/ps5-slim-digital.jpg',
     '{"stocare":"SSD 1TB","rezolutie_max":"4K","unitate_optica":false}', TRUE, '2026-09-01'),
(20, 18, 15,'TG-CON-0002', 'Consolă Microsoft Xbox Series S 512GB', 'Consolă compactă next-gen', 1399.99, 6, 24, '/img/produse/xbox-series-s.jpg',
     '{"stocare":"SSD 512GB","rezolutie_max":"1440p","unitate_optica":false}', TRUE, '2026-09-01'),
(21, 19, 16,'TG-CON-0003', 'Consolă Nintendo Switch OLED', 'Consolă hibridă cu ecran OLED 7"', 1599.99, 7, 24, '/img/produse/switch-oled.jpg',
     '{"ecran":"7\" OLED","stocare_gb":64,"portabila":true}', TRUE, '2026-09-01'),
-- Periferice
(22, 20, 17,'TG-KB-0001',  'Tastatură mecanică Logitech G Pro X TKL', 'Tastatură TKL wireless pentru esports', 899.99, 9, 24, '/img/produse/logitech-gpro-tkl.jpg',
     '{"tip":"mecanica","format":"TKL","switch":"GX Brown","conexiune":"wireless/USB","iluminare":"RGB"}', TRUE, '2026-09-01'),
(23, 20, 18,'TG-KB-0002',  'Tastatură Razer BlackWidow V4 X', 'Tastatură mecanică full-size cu taste macro', 599.99, 7, 24, '/img/produse/razer-blackwidow-v4x.jpg',
     '{"tip":"mecanica","format":"full-size","switch":"Razer Green","conexiune":"USB","iluminare":"RGB"}', TRUE, '2026-09-01'),
(24, 21, 17,'TG-MS-0001',  'Mouse Logitech G502 X Plus Wireless', 'Mouse de gaming wireless cu senzor HERO 25K', 699.99, 12, 24, '/img/produse/logitech-g502x.jpg',
     '{"dpi_max":25600,"conexiune":"wireless","greutate_g":106,"butoane":13}', TRUE, '2026-09-01'),
(25, 21, 18,'TG-MS-0002',  'Mouse Razer DeathAdder V3', 'Mouse ergonomic ultra-ușor', 349.99, 20, 24, '/img/produse/razer-deathadder-v3.jpg',
     '{"dpi_max":30000,"conexiune":"USB","greutate_g":59,"butoane":6}', TRUE, '2026-09-01'),
(26, 22, 19,'TG-HS-0001',  'Căști HyperX Cloud III', 'Căști de gaming cu microfon detașabil', 449.99, 15, 24, '/img/produse/hyperx-cloud-iii.jpg',
     '{"tip":"over-ear","conexiune":"jack 3.5mm/USB","microfon":"detasabil","sunet":"DTS Headphone:X"}', TRUE, '2026-09-01'),
(27, 23, 20,'TG-MON-0001', 'Monitor gaming LG UltraGear 27GR75Q 27" QHD 165Hz', 'Monitor IPS 1440p pentru gaming', 1399.99, 6, 24, '/img/produse/lg-27gr75q.jpg',
     '{"diagonala_inch":27,"rezolutie":"2560x1440","rata_refresh_hz":165,"panou":"IPS","timp_raspuns_ms":1}', TRUE, '2026-09-01'),
(28, 23, 8, 'TG-MON-0002', 'Monitor Samsung Odyssey G5 32" curbat QHD 144Hz', 'Monitor curbat VA pentru imersiune', 1299.99, 4, 24, '/img/produse/samsung-odyssey-g5.jpg',
     '{"diagonala_inch":32,"rezolutie":"2560x1440","rata_refresh_hz":144,"panou":"VA","curbat":true}', TRUE, '2026-09-01'),
(29, 24, 14,'TG-CTR-0001', 'Controller Sony DualSense pentru PS5', 'Controller wireless cu feedback haptic', 349.99, 18, 24, '/img/produse/dualsense.jpg',
     '{"compatibilitate":["PS5","PC"],"conexiune":"Bluetooth/USB-C","culoare":"alb"}', TRUE, '2026-09-01'),
(30, 24, 15,'TG-CTR-0002', 'Controller Microsoft Xbox Wireless Controller', 'Controller oficial Xbox, compatibil PC', 299.99, 14, 24, '/img/produse/xbox-controller.jpg',
     '{"compatibilitate":["Xbox Series X|S","Xbox One","PC"],"conexiune":"Bluetooth/USB-C","culoare":"negru"}', TRUE, '2026-09-01'),
-- Jocuri
(31, 25, 22,'TG-GAME-0001','Cyberpunk 2077 Ultimate Edition (PC)', 'Joc RPG open-world, include expansiunea Phantom Liberty', 249.99, 25, 0, '/img/produse/cyberpunk-pc.jpg',
     '{"platforma":"PC","gen":"RPG","pegi":18,"format":"cod digital"}', TRUE, '2026-09-01'),
(32, 26, 14,'TG-GAME-0002','Gran Turismo 7 (PS5)', 'Simulator auto exclusiv PlayStation', 279.99, 12, 0, '/img/produse/gt7-ps5.jpg',
     '{"platforma":"PS5","gen":"curse","pegi":3,"format":"fizic"}', TRUE, '2026-09-01'),
(33, 27, 16,'TG-GAME-0003','The Legend of Zelda: Tears of the Kingdom (Switch)', 'Aventură open-world pentru Nintendo Switch', 299.99, 10, 0, '/img/produse/zelda-totk.jpg',
     '{"platforma":"Nintendo Switch","gen":"aventura","pegi":12,"format":"fizic"}', TRUE, '2026-09-01'),
-- Accesorii
(34, 28, 21,'TG-ACC-0001', 'Pastă termică Arctic MX-6 4g', 'Pastă termică de înaltă performanță', 39.99, 60, 0, '/img/produse/arctic-mx6.jpg',
     '{"cantitate_g":4,"conductivitate_w_mk":8.5}', TRUE, '2026-09-01'),
(35, 28, 21,'TG-ACC-0002', 'Cooler procesor Arctic Freezer 36', 'Cooler tower silențios, compatibil AM5/LGA1700', 159.99, 16, 72, '/img/produse/arctic-freezer36.jpg',
     '{"tip":"aer","ventilatoare":2,"tdp_max_w":200,"socket":["AM5","AM4","LGA1700"]}', TRUE, '2026-09-01'),
(36, 29, 23,'TG-ACC-0003', 'Cablu HDMI 2.1 Ugreen 8K 2m', 'Cablu HDMI 2.1 pentru console și monitoare', 59.99, 40, 24, '/img/produse/ugreen-hdmi21.jpg',
     '{"versiune":"2.1","lungime_m":2,"rezolutie_max":"8K@60Hz / 4K@120Hz"}', TRUE, '2026-09-01'),
-- Produs scos din vânzare (exemplu pentru câmpul "activ")
(37, 8, 5,  'TG-GPU-0004', 'Placă video Gigabyte GeForce RTX 3060 Gaming OC 12GB', 'Model din generația anterioară – nu mai este comercializat', 1299.99, 0, 36, '/img/produse/gigabyte-rtx3060.jpg',
     '{"chipset":"NVIDIA GeForce RTX 3060","memorie_gb":12,"tip_memorie":"GDDR6"}', FALSE, '2026-09-01');

-- ---------------------------------------------------------------------
-- COSURI și COS_PRODUSE  (coșuri active ale unor clienți)
-- ---------------------------------------------------------------------
INSERT INTO cosuri (id_cos, id_utilizator, data_creare, data_actualizare) VALUES
(1, 4, '2026-11-10 20:00', '2026-11-14 21:15'),
(2, 6, '2026-11-12 18:30', '2026-11-12 18:45'),
(3, 7, '2026-11-15 10:00', '2026-11-15 10:20'),
(4, 9, '2026-11-01 09:00', '2026-11-01 09:05');   -- coș abandonat (exemplu pentru rapoarte)

INSERT INTO cos_produse (id_cos, id_produs, cantitate, data_adaugare) VALUES
(1, 27, 1, '2026-11-10 20:00'),
(1, 36, 2, '2026-11-14 21:15'),
(2, 1,  1, '2026-11-12 18:30'),
(2, 12, 1, '2026-11-12 18:35'),
(2, 7,  1, '2026-11-12 18:45'),
(3, 33, 1, '2026-11-15 10:00'),
(3, 21, 1, '2026-11-15 10:20'),
(4, 26, 1, '2026-11-01 09:05');

-- ---------------------------------------------------------------------
-- COMENZI  (total se calculează mai jos din detalii + transport)
-- ---------------------------------------------------------------------
INSERT INTO comenzi (id_comanda, id_utilizator, numar_comanda, data_comanda, status, metoda_plata, cost_transport, total,
                     adresa_livrare, oras_livrare, judet_livrare, telefon_contact, observatii) VALUES
(1,  4, 'TG-2026-00001', '2026-09-15 19:42', 'livrata',   'card',     0.00,  0, 'Bd. Unirii 21, bl. A3, ap. 12', 'București',  'București', '0722111222', NULL),
(2,  5, 'TG-2026-00002', '2026-09-22 10:15', 'livrata',   'ramburs', 19.99,  0, 'Str. Lăpușneanu 8',             'Iași',       'Iași',      '0733222333', 'Sunați înainte de livrare'),
(3,  6, 'TG-2026-00003', '2026-10-02 22:05', 'livrata',   'card',     0.00,  0, 'Str. Memorandumului 30',        'Cluj-Napoca','Cluj',      '0744333444', NULL),
(4,  4, 'TG-2026-00004', '2026-10-11 14:30', 'livrata',   'transfer', 0.00,  0, 'Bd. Unirii 21, bl. A3, ap. 12', 'București',  'București', '0722111222', 'Factură pe persoană fizică'),
(5,  7, 'TG-2026-00005', '2026-10-19 09:50', 'anulata',   'ramburs', 19.99,  0, 'Str. Republicii 64',            'Brăila',     'Brăila',    '0755444555', 'Anulată la cererea clientului'),
(6,  8, 'TG-2026-00006', '2026-10-28 17:20', 'livrata',   'card',     0.00,  0, 'Str. Tomis 102',                'Constanța',  'Constanța', '0766555666', NULL),
(7,  5, 'TG-2026-00007', '2026-11-04 12:00', 'expediata', 'card',     0.00,  0, 'Str. Lăpușneanu 8',             'Iași',       'Iași',      '0733222333', NULL),
(8,  9, 'TG-2026-00008', '2026-11-09 20:10', 'procesata', 'ramburs', 19.99,  0, 'Str. Gării 5',                  'Galați',     'Galați',    '0777666777', NULL),
(9,  6, 'TG-2026-00009', '2026-11-13 08:45', 'plasata',   'card',     0.00,  0, 'Str. Memorandumului 30',        'Cluj-Napoca','Cluj',      '0744333444', NULL),
(10, 7, 'TG-2026-00010', '2026-11-15 16:30', 'plasata',   'transfer', 0.00,  0, 'Str. Republicii 64',            'Brăila',     'Brăila',    '0755444555', NULL);

-- DETALII_COMANDA – unele prețuri diferă de prețul actual (promoții / modificări de preț)
INSERT INTO detalii_comanda (id_comanda, id_produs, cantitate, pret_unitar) VALUES
(1,  4,  1, 3499.99),   -- prețul de atunci era mai mare decât cel actual (3399.99)
(1,  14, 1,  649.99),
(2,  19, 1, 2299.99),
(2,  29, 1,  349.99),
(2,  32, 1,  299.99),   -- joc cumpărat la prețul vechi
(3,  15, 1, 6499.99),
(3,  24, 1,  699.99),
(4,  9,  2,  649.99),
(4,  7,  1,  549.99),
(5,  21, 1, 1599.99),
(6,  2,  1,  999.99),
(6,  12, 1, 1099.99),
(6,  8,  1,  229.99),
(6,  35, 1,  159.99),
(6,  34, 2,   39.99),
(7,  26, 1,  449.99),
(7,  25, 1,  349.99),
(8,  20, 1, 1399.99),
(8,  30, 1,  299.99),
(9,  6,  1, 1549.99),
(9,  31, 1,  249.99),
(10, 17, 1, 2499.99);

-- Calculăm totalul fiecărei comenzi: suma (cantitate × preț unitar) + transport
UPDATE comenzi c
SET    total = d.subtotal + c.cost_transport
FROM  (SELECT id_comanda, SUM(cantitate * pret_unitar) AS subtotal
       FROM detalii_comanda GROUP BY id_comanda) d
WHERE  d.id_comanda = c.id_comanda;

-- ---------------------------------------------------------------------
-- MISCARI_STOC
--  a) ieșiri automate pentru fiecare produs vândut (comenzile neanulate)
--  b) intrare + retur pentru comanda anulată
--  c) o corecție de inventar
--  d) recepția inițială: cantitatea care face ca suma mișcărilor = stocul curent
-- ---------------------------------------------------------------------
-- a) ieșiri prin vânzare (fără angajat → id_utilizator NULL = automat)
INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv, data_miscare)
SELECT d.id_produs, NULL, d.id_comanda, 'iesire', -d.cantitate,
       'Vânzare – comanda ' || c.numar_comanda, c.data_comanda
FROM   detalii_comanda d
JOIN   comenzi c ON c.id_comanda = d.id_comanda;

-- b) comanda 5 a fost anulată → produsul revine în stoc
INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv, data_miscare) VALUES
(21, 2, 5, 'retur', 1, 'Retur în stoc – comanda TG-2026-00005 anulată', '2026-10-19 15:00');

-- c) corecție de inventar
INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv, data_miscare) VALUES
(36, 3, NULL, 'corectie', -2, 'Inventar: 2 cabluri deteriorate la transport', '2026-10-30 11:00');

-- d) recepția inițială de la furnizor (01.09.2026), calculată astfel încât
--    suma tuturor mișcărilor unui produs să fie egală cu produse.stoc
INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv, data_miscare)
SELECT p.id_produs, 2, NULL, 'intrare',
       p.stoc - COALESCE(SUM(m.cantitate), 0),
       'Recepție inițială furnizor', '2026-09-01 08:00'
FROM   produse p
LEFT JOIN miscari_stoc m ON m.id_produs = p.id_produs
GROUP  BY p.id_produs, p.stoc
HAVING p.stoc - COALESCE(SUM(m.cantitate), 0) <> 0;

-- e) o reaprovizionare ulterioară (exemplu de intrare normală)
UPDATE produse SET stoc = stoc + 5 WHERE id_produs = 6;
INSERT INTO miscari_stoc (id_produs, id_utilizator, id_comanda, tip_miscare, cantitate, motiv, data_miscare) VALUES
(6, 3, NULL, 'intrare', 5, 'Reaprovizionare furnizor – factura F-1187', '2026-11-05 10:30');

-- ---------------------------------------------------------------------
-- SERVICII  (lista din Etapa 0, secțiunea 5.1)
-- ---------------------------------------------------------------------
INSERT INTO servicii (id_serviciu, nume, descriere, pret_estimativ, durata_estimata_zile, activ) VALUES
(1, 'Diagnosticare',                          'Identificarea defectului și estimarea costului reparației', 50.00, 1, TRUE),
(2, 'Curățare + schimbare pastă termică',     'Curățarea completă de praf și înlocuirea pastei termice (PC, laptop, consolă)', 150.00, 2, TRUE),
(3, 'Reinstalare sistem de operare',          'Instalare Windows + drivere + programe de bază, cu salvarea datelor', 120.00, 1, TRUE),
(4, 'Înlocuire componentă defectă',           'Înlocuirea componentei defecte (manoperă; piesa se facturează separat)', 100.00, 3, TRUE),
(5, 'Reparație consolă',                      'Reparații PlayStation, Xbox, Nintendo: port HDMI, alimentare, supraîncălzire', 250.00, 5, TRUE),
(6, 'Reparație periferic',                    'Reparații pentru controllere, tastaturi, mouse-uri (stick drift, butoane, cablu)', 80.00, 3, TRUE);

-- ---------------------------------------------------------------------
-- CERERI_SERVICE  (status = stadiul curent; cronologia completă în istoric_service)
-- ---------------------------------------------------------------------
INSERT INTO cereri_service (id_cerere, numar_cerere, id_client, id_angajat, id_serviciu, tip_dispozitiv, marca_dispozitiv, model_dispozitiv, serie_dispozitiv,
                            descriere_problema, status, cost_estimat, cost_final, data_cerere, data_finalizare) VALUES
(1, 'SRV-2026-00001', 4, 2, 2, 'laptop',     'ASUS',     'TUF Gaming F15',      'N3NRKD012345A', 'Laptopul se încălzește foarte tare și se oprește în jocuri.', 'predata',      150.00, 150.00, '2026-09-25 11:00', '2026-09-27 16:00'),
(2, 'SRV-2026-00002', 5, 3, 5, 'consola',    'Sony',     'PlayStation 5',       'E12345678',     'Nu mai afișează imagine pe televizor, ledul clipește.',       'predata',      250.00, 320.00, '2026-10-03 13:20', '2026-10-09 12:00'),
(3, 'SRV-2026-00003', 6, 2, 3, 'calculator', 'Asamblat', 'PC gaming personal',  NULL,            'Windows nu mai pornește după un update.',                    'finalizata',   120.00, 120.00, '2026-10-20 10:00', '2026-10-21 18:00'),
(4, 'SRV-2026-00004', 8, 3, 6, 'periferic',  'Sony',     'DualSense',           NULL,            'Stick-ul stâng se mișcă singur (stick drift).',              'finalizata',    80.00,  95.00, '2026-11-02 09:30', '2026-11-05 14:00'),
(5, 'SRV-2026-00005', 7, 2, 4, 'calculator', 'HP',       'Pavilion Gaming',     '5CD1234XYZ',    'Calculatorul nu pornește deloc, posibil sursă arsă.',        'in_lucru',     100.00,   NULL, '2026-11-08 12:00', NULL),
(6, 'SRV-2026-00006', 9, 3, 1, 'laptop',     'Lenovo',   'IdeaPad 3',           'PF2ABCDE',      'Ecranul pâlpâie și uneori rămâne negru.',                    'in_lucru',      50.00,   NULL, '2026-11-11 15:45', NULL),
(7, 'SRV-2026-00007', 4, NULL, 5, 'consola', 'Nintendo', 'Switch',              'XKW10012345678','Nu se mai încarcă bateria.',                                 'inregistrata',  NULL,    NULL, '2026-11-14 19:10', NULL),
(8, 'SRV-2026-00008', 5, NULL, 2, 'consola', 'Microsoft','Xbox Series X',       NULL,            'Ventilatorul face zgomot foarte mare.',                      'inregistrata',  NULL,    NULL, '2026-11-15 20:00', NULL);

-- ---------------------------------------------------------------------
-- ISTORIC_SERVICE  (ultimul rând al fiecărei cereri = status-ul curent)
-- ---------------------------------------------------------------------
INSERT INTO istoric_service (id_cerere, id_utilizator, status_nou, comentariu, data_modificare) VALUES
-- cererea 1
(1, 4, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-09-25 11:00'),
(1, 2, 'in_lucru',     'Laptop preluat. Praf acumulat în ventilatoare, pasta termică uscată.',    '2026-09-26 09:00'),
(1, 2, 'finalizata',   'Curățat complet, pastă Arctic MX-6 aplicată. Temperaturi în sarcină: 78°C.', '2026-09-27 16:00'),
(1, 2, 'predata',      'Predat clientului prin curier.',                                          '2026-09-28 10:00'),
-- cererea 2
(2, 5, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-10-03 13:20'),
(2, 3, 'in_lucru',     'Diagnostic: port HDMI deteriorat. Cost estimat actualizat după piesă.',   '2026-10-04 10:00'),
(2, 3, 'finalizata',   'Port HDMI înlocuit, consolă testată 2 ore.',                              '2026-10-09 12:00'),
(2, 3, 'predata',      'Ridicată de client din magazin.',                                         '2026-10-10 17:30'),
-- cererea 3
(3, 6, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-10-20 10:00'),
(3, 2, 'in_lucru',     'Date salvate pe disc extern, începe reinstalarea.',                       '2026-10-20 14:00'),
(3, 2, 'finalizata',   'Windows 11 reinstalat, drivere actualizate, date restaurate.',            '2026-10-21 18:00'),
-- cererea 4
(4, 8, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-11-02 09:30'),
(4, 3, 'in_lucru',     'Confirmat stick drift pe stick-ul stâng.',                                '2026-11-03 11:00'),
(4, 3, 'finalizata',   'Modul joystick înlocuit, recalibrat.',                                    '2026-11-05 14:00'),
-- cererea 5
(5, 7, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-11-08 12:00'),
(5, 2, 'in_lucru',     'Sursa confirmată defectă, se așteaptă piesa de la furnizor.',             '2026-11-10 09:30'),
-- cererea 6
(6, 9, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-11-11 15:45'),
(6, 3, 'in_lucru',     'Diagnosticare în curs: se verifică cablul de display.',                   '2026-11-12 10:00'),
-- cererea 7 și 8 – doar înregistrate, încă nepreluate de un angajat
(7, 4, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-11-14 19:10'),
(8, 5, 'inregistrata', 'Cerere depusă online de client.',                                        '2026-11-15 20:00');

-- ---------------------------------------------------------------------
-- Resetăm secvențele SERIAL (am inserat ID-uri explicite),
-- altfel următorul INSERT fără ID ar da eroare de cheie duplicată.
-- ---------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('roluri','id_rol'),               (SELECT MAX(id_rol) FROM roluri));
SELECT setval(pg_get_serial_sequence('utilizatori','id_utilizator'),   (SELECT MAX(id_utilizator) FROM utilizatori));
SELECT setval(pg_get_serial_sequence('categorii','id_categorie'),      (SELECT MAX(id_categorie) FROM categorii));
SELECT setval(pg_get_serial_sequence('marci','id_marca'),              (SELECT MAX(id_marca) FROM marci));
SELECT setval(pg_get_serial_sequence('produse','id_produs'),           (SELECT MAX(id_produs) FROM produse));
SELECT setval(pg_get_serial_sequence('cosuri','id_cos'),               (SELECT MAX(id_cos) FROM cosuri));
SELECT setval(pg_get_serial_sequence('comenzi','id_comanda'),          (SELECT MAX(id_comanda) FROM comenzi));
SELECT setval(pg_get_serial_sequence('servicii','id_serviciu'),        (SELECT MAX(id_serviciu) FROM servicii));
SELECT setval(pg_get_serial_sequence('cereri_service','id_cerere'),    (SELECT MAX(id_cerere) FROM cereri_service));

COMMIT;
