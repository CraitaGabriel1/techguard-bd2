// =====================================================================
//  db.js – conexiunea la baza de date PostgreSQL
//  Folosim un "Pool": un set de conexiuni deschise o singură dată și
//  refolosite pentru fiecare cerere (mult mai rapid decât să deschidem
//  o conexiune nouă la fiecare interogare).
// =====================================================================
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Funcție scurtă pentru interogări:  await db.query('SELECT ...', [param1, param2])
// Parametrii $1, $2 ... protejează împotriva SQL Injection.
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
