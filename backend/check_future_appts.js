const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo 
      FROM appointments 
      WHERE data_ora >= '2026-07-20'
      ORDER BY data_ora ASC
    `);
    console.log(`Appointments count from July 20th onwards: ${res.rows.length}`);
    res.rows.forEach(r => {
      console.log(`[${r.intorno}] ${r.data_ora} | Cliente: ${r.cliente} | Venditore: ${r.venditore} | Tipo: ${r.tipo}`);
    });
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
