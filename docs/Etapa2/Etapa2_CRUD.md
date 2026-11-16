# TECHGUARD – Etapa 2: CRUD și descrierea paginilor

**Tehnologii:** Node.js + Express (server), EJS (pagini generate pe server), PostgreSQL (pachetul `pg`, SQL scris manual, cu parametri `$1, $2...` împotriva SQL Injection).

## Arhitectura aplicației
```
Browser  ──cerere HTTP──►  Express (routes/*.js)  ──SQL──►  PostgreSQL (13 tabele)
         ◄──pagină HTML──  EJS (views/*.ejs)      ◄─rânduri─
```
| Fișier | Rol |
|---|---|
| `server.js` | pornește serverul, sesiunile, datele comune (meniu, coș) |
| `db.js` | conexiunea la PostgreSQL (Pool de conexiuni) |
| `routes/public.js` | magazinul: acasă, catalog, căutare, produs, service |
| `routes/auth.js` | login, înregistrare, logout |
| `routes/client.js` | coș, finalizare comandă, contul meu, istoric |
| `routes/admin.js` | panoul de administrare (CRUD) |
| `lib/operatii.js` | operațiile pe mai multe tabele, în **tranzacții** |
| `middleware/auth.js` | verificarea autentificării și a rolurilor |

## Operațiile CRUD pe fiecare tabel
| Tabel | Create | Read | Update | Delete |
|---|---|---|---|---|
| `produse` | Admin › Produse › Produs nou | catalog, pagina produsului, lista admin | Admin › Editează | Șterge (sau dezactivare dacă are comenzi) |
| `categorii` | Admin › Categorii | meniul, catalogul | Admin › Editează | Șterge (blocat dacă are produse – FK RESTRICT) |
| `marci` | Admin › Mărci | filtrele catalogului | Admin › Editează | Șterge (blocat dacă are produse) |
| `utilizatori` | Înregistrare / Admin › Utilizator nou | Admin › Utilizatori, Contul meu | Contul meu, Admin › Editează (rol, blocare) | Șterge (sau blocare dacă are comenzi) |
| `cosuri` + `cos_produse` | Adaugă în coș | pagina Coș | modificare cantitate | ✕ scoate din coș / golire la comandă |
| `comenzi` + `detalii_comanda` | Finalizează comanda (tranzacție) | Comenzile mele, Admin › Comenzi | schimbare status | anulare (produsele revin în stoc) |
| `miscari_stoc` | automat la comandă/anulare + Admin › Stocuri | Admin › Stocuri | – (istoric, nu se modifică) | – |
| `servicii` | Admin › Servicii | pagina Service | Admin › Editează | Șterge (sau dezactivare) |
| `cereri_service` + `istoric_service` | formularul de pe pagina Service | Cererile mele, Admin › Cereri | Admin: tehnician, status, costuri | – |

## Descrierea paginilor

### Zona publică (Vizitator)
- **Acasă (`/`)** – categoriile cu „de la X lei” (`MIN(pret)` + `GROUP BY`), cele mai vândute produse (`SUM(cantitate)` din `detalii_comanda`), servicii, noutăți.
- **Catalog (`/categorie/:slug`, `/produse?q=`)** – filtre: în stoc, preț minim/maxim, mărci; sortare; paginare (`LIMIT/OFFSET`). Categoria include automat subcategoriile (relația recursivă `id_parinte`).
- **Produs (`/produs/:id`)** – preț, stoc, garanție, specificațiile din coloana **JSONB**, produse similare.
- **Service (`/service`)** – lista serviciilor și formularul de cerere.
- **Login / Cont nou** – parolele sunt verificate și salvate cu **bcrypt**.

### Zona clientului (rol Client)
- **Coș (`/cos`)** – modificare cantitate, ștergere, transport gratuit peste 500 lei.
- **Finalizare comandă (`/checkout`)** – o singură **tranzacție**: verifică stocul (`SELECT ... FOR UPDATE`), creează comanda și detaliile, scade stocul, scrie în `miscari_stoc`, golește coșul. La orice eroare → `ROLLBACK`.
- **Contul meu (`/cont`)** – statistici, editarea datelor, schimbarea parolei.
- **Comenzile mele** – lista, detaliile, bara de progres, anulare cât timp e „plasată”.
- **Cererile de service** – cronologia reparației din `istoric_service`.

### Panoul de administrare (`/admin`) – Angajat și Administrator
- **Panou principal** – indicatori: produse active, stoc redus, comenzi de procesat, vânzările lunii, cereri deschise.
- **Produse** – căutare, filtre, adăugare/editare (inclusiv specificații JSON validate), ștergere.
- **Stocuri** – istoricul mișcărilor + recepție marfă / corecție (stocul nu poate deveni negativ).
- **Comenzi** – filtrare după status, detalii, schimbarea statusului (anularea readuce produsele în stoc).
- **Cereri service** – alocare tehnician, status, costuri; fiecare schimbare adaugă un rând în istoric.
- **Mărci**, iar doar pentru Administrator: **Categorii**, **Servicii**, **Utilizatori** (rol, blocare cont).

## Integritatea datelor demonstrată în aplicație
- **Chei străine `ON DELETE RESTRICT`** – o marcă/categorie folosită nu poate fi ștearsă; aplicația prinde eroarea (cod `23503`) și afișează un mesaj clar.
- **`UNIQUE`** – cod produs / email duplicat → mesaj (cod `23505`).
- **`CHECK`** – stoc ≥ 0, preț ≥ 0, statusuri permise.
- **Tranzacții** – plasarea comenzii, anularea, mișcările de stoc, cererile de service.
- **Prețul istoric** – `detalii_comanda.pret_unitar` păstrează prețul de la momentul cumpărării.
