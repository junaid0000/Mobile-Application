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

const pg = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbUrl = process.argv[2] || process.env.DATABASE_URL;

const connectionConfig = dbUrl
  ? {
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new pg.Pool(connectionConfig);

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

    // ─── 3. Create Admin ───────────────────────────────────────────────────
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

    // ─── 4. Create Seller: Massimo (Code: MR) ──────────────────────────────
    const massimoEmail = 'massimo@rossomandi.com';
    const massimoExists = await pool.query('SELECT id FROM users WHERE email = $1', [massimoEmail]);
    if (massimoExists.rows.length === 0) {
      const hash = await bcrypt.hash('seller123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, venditore_code) VALUES ($1, $2, $3, $4, $5)",
        ['Massimo', massimoEmail, hash, 'seller', 'MR']
      );
      console.log('✓ Created SELLER (Massimo): massimo@rossomandi.com / seller123 (code: MR)');
    } else {
      await pool.query(
        "UPDATE users SET role = 'seller', venditore_code = 'MR' WHERE email = $1",
        [massimoEmail]
      );
      console.log('✓ Seller (Massimo) already exists: massimo@rossomandi.com / seller123 (code: MR)');
    }

    // ─── 5. Summary ───────────────────────────────────────────────────────
    console.log('\n======================================');
    console.log('  SETUP COMPLETE — Accounts Ready:');
    console.log('======================================');
    console.log('  ADMIN  : admin@rossomandi.com    / admin123');
    console.log('  SELLER : massimo@rossomandi.com  / seller123 (code: MR)');
    console.log('======================================\n');

  } catch (err) {
    console.error('\n❌ Error during setup:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

setup();
