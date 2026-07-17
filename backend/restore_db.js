/**
 * CLEAN IMPORT SCRIPT
 * Drops all existing tables and restores everything from rossomandi_backup.sql
 * Run: node restore_db.js
 */

process.chdir('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend');
const { execSync } = require('child_process');
const path = require('path');

// Find psql in common PostgreSQL install paths
const pgPaths = [
  'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
  'psql', // fallback to PATH
];

const fs = require('fs');
let psqlPath = null;
for (const p of pgPaths) {
  if (p === 'psql') { psqlPath = 'psql'; break; }
  if (fs.existsSync(p)) { psqlPath = `"${p}"`; break; }
}

if (!psqlPath) {
  console.error('ERROR: Could not find psql. Please install PostgreSQL client tools.');
  process.exit(1);
}

const backupFile = 'C:\\Users\\JunaidMunir.Janjua\\Desktop\\rossomandi_backup.sql';
if (!fs.existsSync(backupFile)) {
  console.error(`ERROR: Backup file not found at: ${backupFile}`);
  process.exit(1);
}

console.log('\n============================================');
console.log('  ROSSOMANDI — DATABASE RESTORE SCRIPT');
console.log('============================================\n');
console.log(`Using psql: ${psqlPath}`);
console.log(`Backup file: ${backupFile}`);
console.log('\nStep 1: Dropping all existing tables...\n');

const dropSQL = `
  DROP TABLE IF EXISTS public.office_messages CASCADE;
  DROP TABLE IF EXISTS public.documents CASCADE;
  DROP TABLE IF EXISTS public.workshop_visits CASCADE;
  DROP TABLE IF EXISTS public.vehicles CASCADE;
  DROP TABLE IF EXISTS public.policies CASCADE;
  DROP TABLE IF EXISTS public.appointments CASCADE;
  DROP TABLE IF EXISTS public.users CASCADE;
  DROP SEQUENCE IF EXISTS public.appointments_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.documents_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.office_messages_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.policies_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.vehicles_id_seq CASCADE;
  DROP SEQUENCE IF EXISTS public.workshop_visits_id_seq CASCADE;
`;

// Write drop SQL to temp file
const tempDropFile = 'C:\\Users\\JunaidMunir.Janjua\\Desktop\\drop_tables_temp.sql';
fs.writeFileSync(tempDropFile, dropSQL);

try {
  const dropCmd = `${psqlPath} -U postgres -d postgres -f "${tempDropFile}"`;
  execSync(dropCmd, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: 'postgres' }
  });
  console.log('\n✓ All old tables dropped successfully.\n');
} catch (err) {
  console.error('Error dropping tables:', err.message);
  // Continue anyway
}

// Clean up temp file
try { fs.unlinkSync(tempDropFile); } catch(e) {}

console.log('Step 2: Restoring from backup...\n');

try {
  const restoreCmd = `${psqlPath} -U postgres -d postgres -f "${backupFile}"`;
  execSync(restoreCmd, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: 'postgres' }
  });
  console.log('\n✓ Backup restored successfully!\n');
} catch (err) {
  console.error('Restore error:', err.message);
  process.exit(1);
}

// Verify the restore
console.log('Step 3: Verifying restored data...\n');
const pg = require('c:/Users/JunaidMunir.Janjua/Desktop/Mobile-Application-master/backend/node_modules/pg');
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

(async () => {
  try {
    const users = await pool.query('SELECT COUNT(*) as cnt FROM users');
    const appts = await pool.query('SELECT COUNT(*) as cnt FROM appointments');
    const roles = await pool.query("SELECT role, COUNT(*) as cnt FROM users GROUP BY role ORDER BY role");

    console.log('============================================');
    console.log('  RESTORE COMPLETE — Summary:');
    console.log('============================================');
    console.log(`  Total Users        : ${users.rows[0].cnt}`);
    console.log(`  Total Appointments : ${appts.rows[0].cnt}`);
    console.log('\n  Users by role:');
    roles.rows.forEach(r => console.log(`    ${r.role.toUpperCase()} : ${r.cnt}`));

    // Show all users with their login info
    const allUsers = await pool.query('SELECT name, email, role, venditore_code FROM users ORDER BY role, name');
    console.log('\n  All user accounts:');
    allUsers.rows.forEach(u => {
      const code = u.venditore_code ? ` (code: ${u.venditore_code})` : '';
      console.log(`    [${u.role.toUpperCase()}] ${u.name} — ${u.email}${code}`);
    });

    console.log('\n  ⚠️  IMPORTANT: Passwords are your ORIGINAL passwords from the old PC.');
    console.log('     If you forgot any password, use Admin panel to reset it.');
    console.log('============================================\n');

  } catch (err) {
    console.error('Verification error:', err.message);
  } finally {
    await pool.end();
  }
})();
