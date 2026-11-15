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

## Tehnologii
- Bază de date: **PostgreSQL**

## Structura folderului
| Fișier | Conținut |
|---|---|
| `TECHGUARD_Etapa0_Tema.pdf` | Documentația Etapei 0 |
| `TECHGUARD_Etapa1_Modelare.pdf` | Documentația Etapei 1 (de predat) |
| `Etapa1_Structura_tabele.md` | Pasul 3 – structura celor 13 tabele |
| `Etapa1_Relatii_ERD.md` | Pașii 4–5 – relații și diagrama ERD (Mermaid) |
| `Etapa1_Normalizare.md` | Pasul 6 – normalizarea |
| `sql/01_schema.sql` | Creează cele 13 tabele |
| `sql/02_date_test.sql` | Datele de test (fixtures) |
| `sql/03_verificare.sql` | Interogări de verificare și demonstrație |
| `ruleaza_etapa1.bat` | Rulează automat toate scripturile |

## Cum creez baza de date
1. Dublu-click pe `ruleaza_etapa1.bat` și introdu parola utilizatorului `postgres`.
2. Sau manual, din PowerShell:
```powershell
cd "A:\PROIECT BD"
& "A:\APLICATII\POSTGRESS\bin\psql.exe" -U postgres -c "CREATE DATABASE techguard"
& "A:\APLICATII\POSTGRESS\bin\psql.exe" -U postgres -d techguard -f sql\01_schema.sql
& "A:\APLICATII\POSTGRESS\bin\psql.exe" -U postgres -d techguard -f sql\02_date_test.sql
& "A:\APLICATII\POSTGRESS\bin\psql.exe" -U postgres -d techguard -f sql\03_verificare.sql
```

Conturi de test (parola pentru toate: `Parola123!`):
- Administrator: `admin@techguard.ro`
- Angajat: `andrei.popa@techguard.ro`
- Client: `mihai.ionescu@gmail.com`
