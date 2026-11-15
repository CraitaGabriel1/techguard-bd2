# TECHGUARD – Etapa 1: Modelare
## Pasul 6 – Normalizarea bazei de date

### Ce este normalizarea?
Normalizarea este procesul prin care organizăm datele în tabele astfel încât **fiecare informație să fie salvată o singură dată**. Dacă aceeași informație apare în mai multe locuri (redundanță), apar trei probleme, numite **anomalii**:

| Anomalie | Exemplu dacă NU am normaliza |
|---|---|
| **De actualizare** | Numele mărcii „ASUS” scris în fiecare produs; dacă îl corectăm, trebuie modificat în sute de rânduri – și uităm unele |
| **De inserare** | Nu putem adăuga o categorie nouă până nu există un produs în ea |
| **De ștergere** | Ștergem ultimul produs AMD și pierdem odată cu el și informațiile despre marca AMD |

Baza TECHGUARD respectă **primele trei forme normale (1NF, 2NF, 3NF)**.

---

### Prima formă normală (1NF) – valori atomice
**Regula:** fiecare celulă conține o singură valoare; nu există liste sau grupuri repetitive în aceeași coloană.

**Cum o respectăm:**
- O comandă cu mai multe produse **nu** are o coloană `produse = "RTX 4070, Ryzen 7, 32GB RAM"`. Fiecare produs este un rând separat în `detalii_comanda`.
- La fel, produsele din coș sunt rânduri separate în `cos_produse`.
- Numele și prenumele sunt coloane separate, nu un singur câmp „nume complet”.

**Excepție justificată – `produse.specificatii` (JSONB):** PostgreSQL tratează JSONB ca **un singur tip de date structurat**, pe care îl poate valida, filtra și indexa. Specificațiile diferă complet de la o categorie la alta (un procesor are „socket”, un monitor are „diagonală”), iar alternativa ar fi zeci de tabele aproape goale. Specificațiile sunt doar informative și nu participă la relații, deci nu creează anomalii.

### A doua formă normală (2NF) – dependență de toată cheia
**Regula:** tabelul este în 1NF și fiecare coloană depinde de **întreaga** cheie primară, nu doar de o parte a ei. Contează doar la tabelele cu **cheie compusă**.

**Cum o respectăm:**
- `detalii_comanda` are cheia (id_comanda, id_produs). Coloanele `cantitate` și `pret_unitar` depind de **ambele**: cantitatea unui anumit produs într-o anumită comandă.
- Numele produsului **nu** este în `detalii_comanda`, pentru că depinde doar de `id_produs` (doar de o parte a cheii) – el stă în `produse`.
- Data comenzii **nu** este în `detalii_comanda`, pentru că depinde doar de `id_comanda` – ea stă în `comenzi`.
- Același raționament pentru `cos_produse`.

### A treia formă normală (3NF) – fără dependențe tranzitive
**Regula:** tabelul este în 2NF și nicio coloană care nu face parte din cheie nu depinde de o altă coloană care nu face parte din cheie.

**Cum o respectăm:**
- În `produse` păstrăm doar `id_marca`, **nu** și numele sau țara mărcii. Țara depinde de marcă, nu de produs → stă în `marci`.
- În `utilizatori` păstrăm `id_rol`, **nu** și descrierea rolului → stă în `roluri`.
- În `cereri_service` păstrăm `id_serviciu`, **nu** și prețul estimativ al serviciului → stă în `servicii`.
- În `produse` păstrăm `id_categorie` (subcategoria), **nu** și categoria principală – aceasta se află urmând `id_parinte` în `categorii`.

---

### Redundanță controlată (denormalizare intenționată)
Există câteva câmpuri care **par** duplicate, dar sunt **decizii conștiente**. Ele se împart în două grupe:

**A. Copii istorice („instantanee”) – nu sunt redundanță reală**
Acestea salvează valoarea **de la un moment dat**, care trebuie să rămână neschimbată:

| Câmp | De ce nu e redundanță |
|---|---|
| `detalii_comanda.pret_unitar` | Prețul plătit atunci. Dacă prețul produsului se schimbă, factura veche rămâne corectă. |
| `comenzi.adresa_livrare`, `oras_livrare`, `judet_livrare`, `telefon_contact` | Adresa unde s-a livrat atunci, chiar dacă clientul se mută ulterior. |

**B. Valori calculate păstrate pentru performanță**

| Câmp | Ar putea fi calculat din | De ce îl păstrăm |
|---|---|---|
| `produse.stoc` | suma cantităților din `miscari_stoc` | Stocul se afișează pe fiecare pagină; un calcul de sumă la fiecare afișare ar fi lent |
| `comenzi.total` | suma `cantitate × pret_unitar` + transport | „Îngheață” suma plătită și face rapoartele de vânzări mult mai rapide |
| `cereri_service.status` | ultimul rând din `istoric_service` | Stadiul curent se afișează des în contul clientului și în panoul angajaților |

**Cum păstrăm aceste valori corecte?** Orice modificare se face într-o **tranzacție** (concept din laboratorul de tranzacții): de exemplu, la plasarea comenzii, în aceeași tranzacție se inserează comanda, detaliile, mișcările de stoc și se scade `produse.stoc`. Dacă un pas eșuează, totul se anulează (`ROLLBACK`). Acest lucru va fi implementat în Etapa 2 (CRUD).

---

### Concluzie
- Fiecare entitate (rol, utilizator, categorie, marcă, produs, serviciu, comandă, cerere) are **propriul tabel**.
- Legăturile se fac **doar prin chei străine** (ID-uri), nu prin copierea datelor.
- Baza este în **3NF**, cu o excepție documentată (JSONB) și cu câteva câmpuri de redundanță controlată, justificate prin nevoia de istoric corect și de performanță.
