# TECHGUARD – Magazin online IT & Gaming

Proiect pentru disciplina **Baze de Date Avansate** (2026–2027)
Student: Crăița Gabriel Ștefan · Grupa 22C31A

Magazin online pentru produse IT & Gaming (componente, calculatoare, laptopuri, console,
periferice, jocuri) cu zonă de service pentru mentenanță și reparații.

## Etape
| Etapă | Conținut | Stare |
|---|---|---|
| 0 – Tema | Domeniu, funcționalități, roluri | ✅ Finalizată |
| 1 – Modelare | 13 tabele, relații, PK/FK, date de test | ✅ Finalizată |
| 2 – CRUD | Administrare produse, categorii, utilizatori, comenzi, service | ⏳ |
| 3 – Autentificare | Înregistrare, login, 3 roluri | ⏳ |
| 4 – Performanță | Indecși, optimizare, load test | ⏳ |
| 5 – Rapoarte | Export PDF / CSV / Excel | ⏳ |
| 6 – Susținere | Prezentare finală | ⏳ |

## Structura proiectului
```
PROIECT BD/
├── README.md                       ← această pagină
├── docs/                           ← documentația fiecărei etape
│   ├── Etapa0/
│   │   └── TECHGUARD_Etapa0_Tema.pdf
│   └── Etapa1/
│       ├── TECHGUARD_Etapa1_Modelare.pdf   ← documentul de predat
│       ├── 01_Structura_tabele.md
│       ├── 02_Relatii_ERD.md               ← diagrama ERD (Mermaid)
│       ├── 03_Normalizare.md
│       └── ERD.png
├── database/                       ← baza de date PostgreSQL
│   ├── 01_schema.sql               ← creează cele 13 tabele
│   ├── 02_date_test.sql            ← datele de test (fixtures)
│   ├── 03_verificare.sql           ← interogări de verificare
│   └── rezultat_verificare.txt     ← rezultatul ultimei rulări
└── scripts/                        ← scripturi de lucru (dublu-click)
    ├── ruleaza_etapa1.bat          ← creează și populează baza de date
    └── publica_github.bat          ← urcă modificările pe GitHub
```
De la Etapa 2, codul aplicației (site-ul) va fi adăugat în folderul `app/`.

## Cum creez baza de date
Dublu-click pe `scripts\ruleaza_etapa1.bat` și introdu parola utilizatorului `postgres`.

Sau manual, din PowerShell:
```powershell
cd "A:\PROIECT BD"
$psql = "A:\APLICATII\POSTGRESS\bin\psql.exe"
& $psql -U postgres -c "CREATE DATABASE techguard"
& $psql -U postgres -d techguard -f database\01_schema.sql
& $psql -U postgres -d techguard -f database\02_date_test.sql
& $psql -U postgres -d techguard -f database\03_verificare.sql
```

## Conturi de test
Parola pentru toate conturile: `Parola123!`
| Rol | Email |
|---|---|
| Administrator | `admin@techguard.ro` |
| Angajat | `andrei.popa@techguard.ro` |
| Client | `mihai.ionescu@gmail.com` |

## Tehnologii
- Bază de date: **PostgreSQL 18**
