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

---

## Pasul 3 – Structura tabelelor (Partea 2: Stoc, Coș, Comenzi, Service)

### 6. `miscari_stoc`
Istoricul fiecărei modificări de stoc. Stocul curent rămâne în `produse.stoc`; aici vedem **de ce** s-a schimbat.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_miscare | SERIAL | **PK** | Identificatorul mișcării |
| id_produs | INT | **FK → produse**, NN | Produsul afectat |
| id_utilizator | INT | **FK → utilizatori**, poate fi NULL | Angajatul care a făcut operația (NULL = automat, la plasarea unei comenzi) |
| id_comanda | INT | **FK → comenzi**, poate fi NULL | Comanda care a scos produsul din stoc (doar pentru ieșiri prin vânzare) |
| tip_miscare | VARCHAR(20) | NN, doar: `intrare`, `iesire`, `corectie`, `retur` | Tipul operației |
| cantitate | INT | NN, ≠ 0 | Pozitiv = intră în stoc, negativ = iese din stoc |
| motiv | VARCHAR(255) | – | Ex: „Recepție furnizor”, „Produs deteriorat” |
| data_miscare | TIMESTAMP | implicit acum | Când a avut loc |

### 7. `cosuri`
Coșul de cumpărături al unui client. **Relație 1:1** cu `utilizatori` – fiecare client are un singur coș.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_cos | SERIAL | **PK** | Identificatorul coșului |
| id_utilizator | INT | **FK → utilizatori**, NN, **UQ** | Proprietarul coșului. `UNIQUE` garantează relația 1:1 |
| data_creare | TIMESTAMP | implicit acum | Când a fost creat coșul |
| data_actualizare | TIMESTAMP | implicit acum | Ultima modificare (util pentru coșuri abandonate) |

### 8. `cos_produse`
Produsele din coș. **Tabel de legătură** pentru relația Many-to-Many dintre `cosuri` și `produse`.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_cos | INT | **PK (compusă)**, **FK → cosuri** | Coșul |
| id_produs | INT | **PK (compusă)**, **FK → produse** | Produsul |
| cantitate | INT | NN, > 0 | Câte bucăți |
| data_adaugare | TIMESTAMP | implicit acum | Când a fost pus în coș |

**Cheie primară compusă** = perechea (id_cos, id_produs). Același produs nu poate apărea de două ori în același coș – se mărește cantitatea.

### 9. `comenzi`
Comenzile plasate de clienți.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_comanda | SERIAL | **PK** | Identificatorul comenzii |
| id_utilizator | INT | **FK → utilizatori**, NN | Clientul care a comandat |
| numar_comanda | VARCHAR(20) | NN, UQ | Număr afișat clientului, ex: `TG-2026-00001` |
| data_comanda | TIMESTAMP | implicit acum | Când a fost plasată |
| status | VARCHAR(20) | NN, doar: `plasata`, `procesata`, `expediata`, `livrata`, `anulata` | Stadiul comenzii |
| metoda_plata | VARCHAR(20) | NN, doar: `card`, `ramburs`, `transfer` | Cum plătește clientul |
| cost_transport | NUMERIC(10,2) | NN, ≥ 0, implicit 0 | Costul livrării |
| total | NUMERIC(10,2) | NN, ≥ 0 | Suma finală plătită (produse + transport) |
| adresa_livrare | VARCHAR(255) | NN | Copiată din cont la plasare |
| oras_livrare | VARCHAR(50) | NN | Orașul de livrare |
| judet_livrare | VARCHAR(50) | NN | Județul de livrare |
| telefon_contact | VARCHAR(15) | NN | Telefonul pentru curier |
| observatii | TEXT | – | Mențiuni ale clientului |

**De ce copiem adresa în comandă?** Dacă clientul se mută, comenzile vechi trebuie să arate adresa unde au fost livrate atunci.

### 10. `detalii_comanda`
Produsele dintr-o comandă. **Tabel de legătură** Many-to-Many între `comenzi` și `produse`.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_comanda | INT | **PK (compusă)**, **FK → comenzi** | Comanda |
| id_produs | INT | **PK (compusă)**, **FK → produse** | Produsul cumpărat |
| cantitate | INT | NN, > 0 | Câte bucăți |
| pret_unitar | NUMERIC(10,2) | NN, ≥ 0 | **Prețul de la momentul cumpărării** (nu se schimbă dacă se modifică prețul produsului) |

### 11. `servicii`
Lista serviciilor oferite (secțiunea 5.1 din Etapa 0).

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_serviciu | SERIAL | **PK** | Identificatorul serviciului |
| nume | VARCHAR(100) | NN, UQ | Ex: „Curățare + schimbare pastă termică” |
| descriere | TEXT | – | Ce include serviciul |
| pret_estimativ | NUMERIC(10,2) | ≥ 0 | Prețul orientativ afișat pe site |
| durata_estimata_zile | SMALLINT | > 0 | În câte zile se finalizează de obicei |
| activ | BOOLEAN | implicit TRUE | FALSE = nu mai este oferit |

### 12. `cereri_service`
Cererile de service ale clienților.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_cerere | SERIAL | **PK** | Identificatorul cererii |
| numar_cerere | VARCHAR(20) | NN, UQ | Număr afișat clientului, ex: `SRV-2026-00001` |
| id_client | INT | **FK → utilizatori**, NN | Clientul care a depus cererea |
| id_angajat | INT | **FK → utilizatori**, poate fi NULL | Angajatul care a preluat-o (NULL = încă nepreluată) |
| id_serviciu | INT | **FK → servicii**, NN | Serviciul solicitat |
| tip_dispozitiv | VARCHAR(20) | NN, doar: `calculator`, `laptop`, `consola`, `periferic` | Ce fel de dispozitiv |
| marca_dispozitiv | VARCHAR(60) | NN | Ex: „Lenovo”, „Sony” (text liber – clientul poate aduce orice marcă) |
| model_dispozitiv | VARCHAR(100) | – | Ex: „Legion 5”, „PlayStation 5” |
| serie_dispozitiv | VARCHAR(50) | – | Seria dispozitivului (identificare la predare) |
| descriere_problema | TEXT | NN | Ce problemă descrie clientul |
| status | VARCHAR(20) | NN, doar: `inregistrata`, `in_lucru`, `finalizata`, `predata`; implicit `inregistrata` | Stadiul curent |
| cost_estimat | NUMERIC(10,2) | ≥ 0 | Costul estimat la diagnosticare |
| cost_final | NUMERIC(10,2) | ≥ 0 | Costul real al intervenției |
| data_cerere | TIMESTAMP | implicit acum | Când a fost depusă |
| data_finalizare | TIMESTAMP | – | Când a fost finalizată |

**Două chei străine spre același tabel:** `id_client` și `id_angajat` arată amândouă spre `utilizatori`, dar cu roluri diferite.

### 13. `istoric_service`
Fiecare schimbare de stadiu a unei reparații – cronologia văzută de client.

| Câmp | Tip | Constrângeri | Explicație |
|---|---|---|---|
| id_istoric | SERIAL | **PK** | Identificatorul înregistrării |
| id_cerere | INT | **FK → cereri_service**, NN | Cererea la care se referă |
| id_utilizator | INT | **FK → utilizatori**, NN | Cine a făcut schimbarea |
| status_nou | VARCHAR(20) | NN, aceleași valori ca la `cereri_service.status` | Stadiul în care a trecut |
| comentariu | TEXT | – | Ex: „Înlocuită pasta termică, temperaturi OK” |
| data_modificare | TIMESTAMP | implicit acum | Când a avut loc |

---

### Redundanță controlată (decizii intenționate)
| Câmp | De ce există, deși ar putea fi calculat |
|---|---|
| `produse.stoc` | Citit pe fiecare pagină; calculul din `miscari_stoc` ar fi lent |
| `comenzi.total` | „Îngheață” suma plătită; rapoartele de vânzări devin rapide |
| `cereri_service.status` | Stadiul curent se afișează des; istoricul complet e în `istoric_service` |

Consistența acestor câmpuri va fi asigurată prin tranzacții (Etapa 2) – vezi Pasul 6, Normalizarea.
