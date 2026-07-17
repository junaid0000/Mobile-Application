/**
 * SETUP SCRIPT — Run this ONE TIME to restore users & sample appointments on the new PC.
 * 
 * This will:
 *  1. Ensure all tables exist (venditore_code column etc.)
 *  2. Create a seller account (venditore1 / seller123)
 *  3. Create a client account (client1 / client123)
 *  4. Insert sample appointments for that seller
 * 
 * Run from the backend directory:
 *   node setup_users.js
 */

process.chdir('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend');
const pg   = require('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend/node_modules/pg');
const bcrypt = require('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend/node_modules/bcryptjs');
require('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend/node_modules/dotenv').config({
  path: 'c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend/.env'
});

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setup() {
  console.log('\n======================================');
  console.log('  ROSSOMANDI — NEW PC SETUP SCRIPT');
  console.log('======================================\n');

  try {
    // ─── 1. Ensure venditore_code column exists ────────────────────────────
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS venditore_code VARCHAR(10) UNIQUE;`);
    console.log('✓ Verified users table schema (venditore_code column exists)');

    // ─── 2. Show current users ────────────────────────────────────────────
    const existing = await pool.query('SELECT id, name, email, role, venditore_code FROM users ORDER BY id');
    console.log('\nCurrent users in database:');
    existing.rows.forEach(u => {
      console.log(`  [${u.role.toUpperCase()}] ${u.name} <${u.email}> (code: ${u.venditore_code || 'none'})`);
    });

    // ─── 3. Create Admin (if not already there) ────────────────────────────
    const adminEmail = 'admin@rossomandi.com';
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminExists.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['System Admin', adminEmail, hash, 'admin']
      );
      console.log('\n✓ Created ADMIN: admin@rossomandi.com / admin123');
    } else {
      console.log('\n✓ Admin already exists: admin@rossomandi.com / admin123');
    }

    // ─── 4. Create Seller ─────────────────────────────────────────────────
    const sellerEmail = 'venditore1@rossomandi.com';
    const sellerExists = await pool.query('SELECT id FROM users WHERE email = $1', [sellerEmail]);
    if (sellerExists.rows.length === 0) {
      const hash = await bcrypt.hash('seller123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, venditore_code) VALUES ($1, $2, $3, $4, $5)",
        ['Venditore Uno', sellerEmail, hash, 'seller', 'V001']
      );
      console.log('✓ Created SELLER: venditore1@rossomandi.com / seller123 (code: V001)');
    } else {
      // Make sure venditore_code is set
      await pool.query(
        "UPDATE users SET role = 'seller', venditore_code = 'V001' WHERE email = $1 AND venditore_code IS NULL",
        [sellerEmail]
      );
      console.log('✓ Seller already exists: venditore1@rossomandi.com / seller123');
    }

    // ─── 5. Create Client ─────────────────────────────────────────────────
    const clientEmail = 'cliente1@rossomandi.com';
    const clientExists = await pool.query('SELECT id FROM users WHERE email = $1', [clientEmail]);
    if (clientExists.rows.length === 0) {
      const hash = await bcrypt.hash('client123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Cliente Uno', clientEmail, hash, 'client']
      );
      console.log('✓ Created CLIENT: cliente1@rossomandi.com / client123');
    } else {
      console.log('✓ Client already exists: cliente1@rossomandi.com / client123');
    }

    // ─── 6. Insert sample appointments ───────────────────────────────────
    const apptCount = await pool.query('SELECT COUNT(*) as cnt FROM appointments');
    if (parseInt(apptCount.rows[0].cnt) === 0) {
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

      const sampleAppts = [
        ['APP-001', 'Mario Rossi',    'V001', tomorrow, 'Milano - Via Roma 10',    'Prima visita cliente', false],
        ['APP-002', 'Giuseppe Verdi', 'V001', nextWeek, 'Torino - Corso Italia 5', 'Rinnovo contratto',    false],
        ['APP-003', 'Anna Bianchi',   'V001', yesterday,'Roma - Via Nazionale 1',  'Appuntamento passato', false],
      ];

      for (const a of sampleAppts) {
        await pool.query(
          `INSERT INTO appointments (intorno, cliente, venditore, data_ora, luogo, note, cancellato)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (intorno) DO NOTHING`,
          a
        );
      }
      console.log('✓ Inserted 3 sample appointments for V001');
    } else {
      console.log(`✓ Appointments already exist (${apptCount.rows[0].cnt} total) — none added`);
    }

    // ─── 7. Summary ───────────────────────────────────────────────────────
    console.log('\n======================================');
    console.log('  SETUP COMPLETE — Login credentials:');
    console.log('======================================');
    console.log('  ADMIN  : admin@rossomandi.com    / admin123');
    console.log('  SELLER : venditore1@rossomandi.com / seller123');
    console.log('  CLIENT : cliente1@rossomandi.com  / client123');
    console.log('\n  NOTE: The SELLER account has venditore_code = V001');
    console.log('  All sellers MUST have a venditore_code to see their appointments.');
    console.log('======================================\n');

  } catch (err) {
    console.error('\n❌ Error during setup:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

setup();
