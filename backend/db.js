const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ngvcirlrsgqrzhgawubu:Rossomandi2026!@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: connectionString.replace(':5432/', ':6543/'),
  ssl: { rejectUnauthorized: false },
  max: 4,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};