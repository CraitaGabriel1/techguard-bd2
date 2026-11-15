# TECHGUARD – Etapa 1: Modelare
## Pasul 3 – Structura tabelelor (Partea 1: Utilizatori și Catalog)

Sistem: PostgreSQL · Total tabele: 13 · Nume în română, fără diacritice

### Tipuri de date folosite (explicație)
| Tip | Ce înseamnă |
|---|---|
| `SERIAL` | Număr întreg care crește automat (1, 2, 3…). Folosit pentru ID-uri. |
| `INT` / `SMALLINT` | Număr întreg (SMALLINT = număr mic, ocupă mai puțin spațiu). |
| `VARCHAR(n)` | Text de maximum n caractere. |
| `TEXT` | Text fără limită (descrieri lungi). |
| `NUMERIC(10,2)` | Număr exact cu 2 zecimale – pentru bani. |
| `BOOLEAN` | Adevărat / fals. |
| `TIMESTAMP` | Dată și oră. |
| `JSONB` | Listă flexibilă de proprietăți (specificații tehnice). |

Notații: **PK** = cheie primară · **FK** = cheie străină · **UQ** = valoare unică · **NN** = obligatoriu (NOT NULL)

---

### 1. `roluri`
Rolurile utilizatorilor autentificați. Vizitatorul nu apare aici (este utilizatorul neautentificat).

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_rol | SERIAL | **PK** | Identificatorul rolului |
| nume_rol | VARCHAR(30) | NN, UQ | Client / Angajat / Administrator |
| descriere | TEXT | – | Ce poate face rolul |

### 2. `utilizatori`
Conturile clienților, angajaților și administratorilor.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_utilizator | SERIAL | **PK** | Identificatorul utilizatorului |
| id_rol | INT | **FK → roluri**, NN | Rolul contului |
| nume | VARCHAR(50) | NN | Numele de familie |
| prenume | VARCHAR(50) | NN | Prenumele |
| email | VARCHAR(100) | NN, UQ | Folosit la autentificare; nu pot exista două conturi cu același email |
| parola_hash | VARCHAR(255) | NN | Parola **criptată** (niciodată parola în clar) |
| telefon | VARCHAR(15) | – | Număr de telefon |
| adresa | VARCHAR(255) | – | Strada, număr, bloc etc. |
| oras | VARCHAR(50) | – | Orașul |
| judet | VARCHAR(50) | – | Județul |
| activ | BOOLEAN | implicit TRUE | Cont activ sau blocat de administrator |
| data_inregistrare | TIMESTAMP | implicit acum | Când s-a creat contul |

### 3. `categorii`
Categoriile **și** subcategoriile (relație recursivă: tabelul se leagă de el însuși).

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_categorie | SERIAL | **PK** | Identificatorul categoriei |
| id_parinte | INT | **FK → categorii**, poate fi NULL | NULL = categorie principală; altfel = subcategoria categoriei indicate |
| nume | VARCHAR(80) | NN | Ex: „Componente PC”, „Plăci video” |
| slug | VARCHAR(100) | NN, UQ | Numele pentru adresa web, ex: `placi-video` |
| descriere | TEXT | – | Text afișat pe pagina categoriei |

### 4. `marci`
Producătorii / mărcile produselor.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_marca | SERIAL | **PK** | Identificatorul mărcii |
| nume | VARCHAR(60) | NN, UQ | Ex: AMD, NVIDIA, ASUS, Sony |
| tara_origine | VARCHAR(50) | – | Țara producătorului |
| website | VARCHAR(150) | – | Site-ul oficial |

### 5. `produse`
Produsele din magazin.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_produs | SERIAL | **PK** | Identificatorul produsului |
| id_categorie | INT | **FK → categorii**, NN | Subcategoria în care apare produsul |
| id_marca | INT | **FK → marci**, NN | Producătorul |
| cod_produs | VARCHAR(30) | NN, UQ | Cod intern unic (SKU), ex: `TG-GPU-0001` |
| nume | VARCHAR(150) | NN | Ex: „Placă video ASUS RTX 4070 Dual 12GB” |
| descriere | TEXT | – | Descrierea de pe pagina produsului |
| pret | NUMERIC(10,2) | NN, ≥ 0 | Prețul curent în lei |
| stoc | INT | NN, ≥ 0, implicit 0 | Câte bucăți sunt disponibile acum |
| garantie_luni | SMALLINT | implicit 24 | Garanția în luni |
| imagine_url | VARCHAR(255) | – | Calea către imaginea produsului |
| specificatii | JSONB | – | Specificații tehnice, ex: `{"memorie": "12 GB", "tip": "GDDR6X"}` |
| activ | BOOLEAN | implicit TRUE | FALSE = produsul nu mai apare pe site |
| data_adaugare | TIMESTAMP | implicit acum | Când a fost adăugat |

**De ce `activ` și nu ștergere?** Un produs care apare în comenzi vechi nu poate fi șters (cheia străină din `detalii_comanda` l-ar „rupe”). Îl dezactivăm: dispare din magazin, dar istoricul comenzilor rămâne corect.
