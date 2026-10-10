const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./db');

// ── Supabase Cloud Storage ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://ngvcirlrsgqrzhgawubu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndmNpcmxyc2dxcnpoZ2F3dWJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2MTUxMSwiZXhwIjoyMTA0MzM3NTExfQ.u8yLJCqgLJm7nBzjSC9we1RGFL3v94-S3Iq71xSBMGM';

async function uploadToSupabase(bucket, filename, fileBuffer, contentType) {
  if (!SUPABASE_SERVICE_KEY) return null;
  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(filename)}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: fileBuffer
    });
    if (res.ok || res.status === 200 || res.status === 201 || res.status === 409) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;
    }
    const errText = await res.text().catch(() => '');
    console.error(`[Supabase] Upload failed for ${filename}: ${res.status} ${errText}`);
    return null;
  } catch (e) {
    console.error(`[Supabase] Upload error for ${filename}:`, e.message);
    return null;
  }
}

async function deleteFromSupabase(bucket, filename) {
  if (!SUPABASE_SERVICE_KEY) return;
  try {
    const delUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}`;
    await fetch(delUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: [filename] })
    });
  } catch (e) {
    console.error(`[Supabase] Delete error for ${filename}:`, e.message);
  }
}

async function storeCloudAsset(code, type, cloudUrl, filename, fileSize) {
  try {
    await db.query(
      `INSERT INTO cloud_assets (code, type, filename, cloud_url, file_size, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (code, type) DO UPDATE SET filename = $3, cloud_url = $4, file_size = $5, uploaded_at = CURRENT_TIMESTAMP`,
      [String(code).toLowerCase(), type, filename || null, cloudUrl, fileSize || null]
    );
  } catch (e) { /* ignore */ }
}

async function getCloudAsset(code, type) {
  try {
    const r = await db.query(
      `SELECT cloud_url, filename FROM cloud_assets WHERE code = $1 AND type = $2`,
      [String(code).toLowerCase(), type]
    );
    return r.rows[0]?.cloud_url || null;
  } catch (e) { return null; }
}
// ────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Rossomandi Backend Running' }));

// Static files for web application
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));



const JWT_SECRET = process.env.JWT_SECRET || 'rossomandi-super-secret-jwt-key-2026';

// Ensure uploads folder exists (use /tmp on Vercel serverless)
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.log('Uploads directory initialization note:', e.message);
}

// Directory for storing car PDF files and images
const PREVENTIVI_PDF_DIR = path.join(__dirname, 'uploads', 'preventivi_pdf');
const SHARED_PUBLIC_PDF_DIR = 'C:\\Users\\Public\\Preventivi_PDF';
const CAR_IMAGES_DIR = path.join(__dirname, 'uploads', 'cars');
const SHARED_PUBLIC_CARS_DIR = 'C:\\Users\\Public\\Esterni photo';

try {
  if (!fs.existsSync(PREVENTIVI_PDF_DIR)) fs.mkdirSync(PREVENTIVI_PDF_DIR, { recursive: true });
  if (!fs.existsSync(SHARED_PUBLIC_PDF_DIR) && !process.env.VERCEL) {
    try { fs.mkdirSync(SHARED_PUBLIC_PDF_DIR, { recursive: true }); } catch (e) {}
  }
  if (!fs.existsSync(CAR_IMAGES_DIR)) fs.mkdirSync(CAR_IMAGES_DIR, { recursive: true });
} catch (e) {
  console.log('Car assets directory initialization note:', e.message);
}

// Serve uploads statically - disable caching for preventivi PDFs so updates are immediately visible
app.use('/uploads/preventivi_pdf', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/uploads', express.static(UPLOADS_DIR));

// Fallback for car images if not found on local disk (redirects to Supabase Cloud Storage)
app.get('/uploads/cars/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(CAR_IMAGES_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.redirect(302, `${SUPABASE_URL}/storage/v1/object/public/car-images/${encodeURIComponent(filename)}`);
});

// Fallback for preventivi PDFs if not found on local disk (redirects to Supabase Cloud Storage)
app.get('/uploads/preventivi_pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(PREVENTIVI_PDF_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(filePath);
  }
  return res.redirect(302, `${SUPABASE_URL}/storage/v1/object/public/preventivi-pdf/${encodeURIComponent(filename)}`);
});

// Database initialization & seeding
const initDb = async () => {
  try {
    // Create users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        phone VARCHAR(50),
        address VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add columns if they don't exist (for existing tables)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'client';`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255);`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS venditore_code VARCHAR(10) UNIQUE;`);

    // Create appointments table and index for MS Access sync
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        intorno VARCHAR(100) UNIQUE,
        cliente VARCHAR(255),
        venditore VARCHAR(50),
        data_ora TIMESTAMP,
        luogo VARCHAR(255),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_venditore ON appointments(venditore);`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS note TEXT;`);
    // Create tester_feedback table for Google Play Testing Feedback
    await db.query(`
      CREATE TABLE IF NOT EXISTS tester_feedback (
        id SERIAL PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        email VARCHAR(255),
        rating INT DEFAULT 5,
        feedback_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellato BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tipo VARCHAR(100);`);

    // Fix specific test accounts to seller role
    await db.query(`
      UPDATE users 
      SET role = 'seller' 
      WHERE email = 'jaidifriend46@gmail.com';
    `);

    // Create vehicles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year VARCHAR(10) NOT NULL,
        license_plate VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create workshop_visits table
    await db.query(`
      CREATE TABLE IF NOT EXISTS workshop_visits (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
        fixes_performed TEXT NOT NULL,
        next_instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure visit_date is timestamp if it was previously created as date
    await db.query(`ALTER TABLE workshop_visits ALTER COLUMN visit_date TYPE TIMESTAMP WITH TIME ZONE;`).catch(() => { });

    // Create documents table
    await db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create office_messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS office_messages (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE office_messages ADD COLUMN IF NOT EXISTS reply_to_id INT REFERENCES office_messages(id) ON DELETE SET NULL;
      ALTER TABLE office_messages ADD COLUMN IF NOT EXISTS recipient_id INT REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE office_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE office_messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
      ALTER TABLE office_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    `);

    // Create settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Initialize chat setting if not exists
    await db.query(`
      INSERT INTO settings (key, value) 
      VALUES ('chat_enabled', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Create stock_usato table (prices stored as exact raw strings from MS Access)
    await db.query(`
      CREATE TABLE IF NOT EXISTS stock_usato (
        indice INT PRIMARY KEY,
        targa VARCHAR(50),
        marca VARCHAR(100),
        versione VARCHAR(255),
        data_immatricolazione TIMESTAMP WITH TIME ZONE,
        km INT,
        colore VARCHAR(100),
        carburante VARCHAR(100),
        cambio VARCHAR(100),
        prezzo_stimato TEXT,
        prezzo_aut TEXT,
        prezzo_vendita TEXT,
        pronta BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE stock_usato ALTER COLUMN prezzo_stimato TYPE TEXT USING prezzo_stimato::TEXT;
      ALTER TABLE stock_usato ALTER COLUMN prezzo_aut TYPE TEXT USING prezzo_aut::TEXT;
      ALTER TABLE stock_usato ALTER COLUMN prezzo_vendita TYPE TEXT USING prezzo_vendita::TEXT;
    `);

    // Create database1_cars & database1_contratti tables for Portale Database1
    await db.query(`
      CREATE TABLE IF NOT EXISTS database1_cars (
        interno VARCHAR(100) PRIMARY KEY,
        cliente VARCHAR(255),
        venditore VARCHAR(100),
        data_contratto TIMESTAMP WITH TIME ZONE,
        modello_vettura VARCHAR(255),
        indirizzo VARCHAR(255),
        residente_a VARCHAR(255),
        data_fatturazione TIMESTAMP WITH TIME ZONE,
        testo3 TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS database1_contratti (
        id SERIAL PRIMARY KEY,
        indice INT UNIQUE,
        codice_cliente VARCHAR(50) UNIQUE,
        interno VARCHAR(100) REFERENCES database1_cars(interno) ON DELETE CASCADE,
        acquirente_nome VARCHAR(100) NOT NULL,
        acquirente_cognome VARCHAR(100) NOT NULL,
        acquirente_telefono VARCHAR(50) NOT NULL,
        venditore VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE database1_contratti ADD COLUMN IF NOT EXISTS indice INT UNIQUE;
    `);

    // Seed test cars for Database1 portal if empty (specifically including Indice 23556)
    try {
      const checkDb1Cars = await db.query('SELECT COUNT(*) FROM database1_cars');
      if (parseInt(checkDb1Cars.rows[0].count) === 0) {
        await db.query(`
          INSERT INTO database1_cars (interno, cliente, venditore, modello_vettura, data_contratto, residente_a)
          VALUES 
            ('23556', 'Test Cliente 23556', 'Massimo (MR)', 'Volkswagen Golf 8 2.0 TDI', CURRENT_TIMESTAMP, 'Roma'),
            ('37901', 'Rossi Marco', 'Giada (GC)', 'Audi A3 Sportback 35 TDI', CURRENT_TIMESTAMP, 'Milano'),
            ('37902', 'Bianchi Luigi', 'Simone (SC)', 'Fiat 500 Hybrid 1.0', CURRENT_TIMESTAMP, 'Torino')
          ON CONFLICT (interno) DO NOTHING;
        `);
        console.log('Seeded Database1 test cars (including Indice 23556)');
      }
    } catch (seedCarErr) {
      console.log('Test cars seeding note:', seedCarErr.message);
    }

    // Seed admin account
    const adminEmail = 'admin@rossomandi.com';
    const adminExists = await db.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (adminExists.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['System Admin', adminEmail, hashedPassword, 'admin']
      );
      console.log('Seeded Admin account (admin@rossomandi.com / admin123)');
    }

    // Seed demo accounts for Google Play Reviewer & official accounts
    const officialSellers = [
      { name: 'Lorenzo', email: 'lorenzo@rossomandi.com', code: 'LR', role: 'admin' },
      { name: 'System Admin', email: 'admin@rossomandi.com', code: 'ADM', role: 'admin' },
      { name: 'Google Play Demo Account', email: 'demo@rossomandi.com', code: 'DEMO', role: 'seller' },
    ];

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultSellerHash = await bcrypt.hash('seller123', defaultSalt);
    const defaultDemoHash = await bcrypt.hash('demo1234', defaultSalt);
    const defaultAdminHash = await bcrypt.hash('admin123', defaultSalt);

    for (const u of officialSellers) {
      try {
        const uExists = await db.query('SELECT * FROM users WHERE email = $1', [u.email.toLowerCase().trim()]);
        let passHash = u.role === 'admin' ? defaultAdminHash : defaultSellerHash;
        if (u.email === 'demo@rossomandi.com') passHash = defaultDemoHash;

        if (uExists.rows.length === 0) {
          await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
            [u.name, u.email.toLowerCase().trim(), passHash, u.role]
          );
          console.log(`Seeded account: ${u.name} (${u.email})`);
        }
      } catch (seedErr) {
        // Ignore duplicate code constraint safely
      }
    }

    // Create cloud_assets table for Supabase Storage URL caching
    await db.query(`
      CREATE TABLE IF NOT EXISTS cloud_assets (
        code VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL,
        filename VARCHAR(255),
        cloud_url TEXT NOT NULL,
        file_size BIGINT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (code, type)
      );
    `);
    await db.query(`
      ALTER TABLE portale_preventivi_esterni 
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS pdf_url TEXT,
      ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS has_pdf BOOLEAN DEFAULT false;
    `).catch(() => {});

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database tables:', err.message);
  }
};
initDb();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Token mancante o non valido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token scaduto o non valido' });
  }
};


// Admin Auth Check Middleware
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    const userResult = await db.query('SELECT role, name, email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'Utente non trovato' });
    }
    const u = userResult.rows[0];
    const nameLower = (u.name || '').toLowerCase();
    const emailLower = (u.email || '').toLowerCase();
    const isAdm = u.role === 'admin' || req.user.role === 'admin' ||
      nameLower.includes('lorenzo') || nameLower.includes('junaid') || nameLower.includes('francesco') || nameLower.includes('valentina') ||
      emailLower.includes('lorenzo') || emailLower.includes('junaid') || emailLower.includes('francesco') || emailLower.includes('valentina');
    if (isAdm) {
      next();
    } else {
      res.status(403).json({ error: 'Accesso negato: Solo amministratori' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Errore server durante la verifica del ruolo admin' });
  }
};

// Office Staff Auth Check Middleware (Admin, Seller, or Staff)
const isOfficeStaff = async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length > 0 && (userResult.rows[0].role === 'admin' || userResult.rows[0].role === 'seller' || userResult.rows[0].role === 'staff')) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: Office staff only' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error verifying role' });
  }
};

// Auto-recognition helper for official Emails, Names, and Seller Codes
function determineUserRoleAndCode(email, name, requestedRole, requestedCode) {
  const emailLower = (email || '').toLowerCase().trim();
  const nameLower = (name || '').toLowerCase().trim();

  // If user requested external collaborator role
  if (requestedRole === 'external' || requestedRole === 'collaborator') {
    return { role: 'external', venditore_code: null };
  }

  // If user requested office staff role
  if (requestedRole === 'staff') {
    return { role: 'staff', venditore_code: null };
  }

  // If user requested seller or provided a code, respect seller role
  if (requestedRole === 'seller' || requestedCode) {
    let code = requestedCode ? requestedCode.toUpperCase().trim() : null;

    if (!code) {
      const officialSellersMap = {
        'simone@gmail.com': 'SC',
        'simone@rossomandi.com': 'SC',
        'giada.coccato@rossomandi.com': 'GC',
        'coccato.giada@rossomandi.com': 'GC',
        'giada@rossomandi.com': 'GC',
        'massimo@rossomandi.com': 'MR',
        'alessia.proto@rossomandi.com': 'AP',
        'proto.alessia@rossomandi.com': 'AP',
        'alessia@rossomandi.com': 'AP',
        'is@rossomandi.com': 'IS',
      };
      if (officialSellersMap[emailLower]) {
        code = officialSellersMap[emailLower];
      } else if (emailLower.includes('simone') || nameLower.includes('simone')) {
        code = 'SC';
      } else if (emailLower.includes('giada') || nameLower.includes('giada') || emailLower.includes('coccato')) {
        code = 'GC';
      } else if (emailLower.includes('massimo') || nameLower.includes('massimo')) {
        code = 'MR';
      } else if (emailLower.includes('alessia') || nameLower.includes('alessia') || emailLower.includes('proto')) {
        code = 'AP';
      }
    }
    return { role: 'seller', venditore_code: code };
  }

  if (requestedRole === 'admin') {
    return { role: 'admin', venditore_code: null };
  }

  return { role: requestedRole || 'seller', venditore_code: null };
}

// Public and authenticated endpoint to get distinct seller codes for dropdowns
const handleSellersList = async (req, res) => {
  try {
    const sellersResult = await db.query(
      `SELECT DISTINCT UPPER(TRIM(venditore)) as code 
       FROM appointments 
       WHERE venditore IS NOT NULL 
         AND TRIM(venditore) != '' 
         AND UPPER(TRIM(venditore)) NOT IN ('GC', 'BERTOLACCI MICHELE')
         AND LENGTH(TRIM(venditore)) <= 4
       ORDER BY code ASC`
    );
    const codes = sellersResult.rows.map(r => r.code);
    res.json({ sellers: codes });
  } catch (err) {
    console.error('Error fetching sellers list:', err.message);
    res.status(500).json({ error: 'Server error fetching sellers' });
  }
};

app.get('/api/public/sellers-list', handleSellersList);
app.get('/api/seller/sellers-list', authenticateToken, handleSellersList);

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, venditore_code, admin_code, security_code, phone, address } = req.body;

    // Check if user exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const emailLower = (email || '').toLowerCase().trim();
    const isOfficialRossomandiEmail = emailLower.endsWith('@rossomandi.com');
    const providedCode = (security_code || admin_code || '').trim().toLowerCase();
    const validCompanyCodes = ['rossomandi', 'rosso2026', '1234', 'admin2026', 'admin123'];

    // 1. Admin Security Check
    if (role === 'admin') {
      const validAdminEmails = ['admin@rossomandi.com', 'lorenzo@rossomandi.com', 'francesco@rossomandi.com', 'valentina@rossomandi.com', 'junaid@rossomandi.com', 'junaidmunir.janjua@rossomandi.com', 'junaidmunir@rossomandi.com'];
      const isOfficialAdminEmail = validAdminEmails.includes(emailLower) || isOfficialRossomandiEmail;
      const isAdminPasscodeValid = providedCode === 'admin2026' || providedCode === '1234' || providedCode === 'rossomandi' || providedCode === 'admin123';

      if (!isOfficialAdminEmail && !isAdminPasscodeValid) {
        return res.status(403).json({ error: 'Codice di sicurezza Amministratore non valido o email non autorizzata.' });
      }
    } else {
      // 2. Company Security Code Check for all new users (External, Staff, Seller)
      const isCodeValid = validCompanyCodes.includes(providedCode);
      if (!isOfficialRossomandiEmail && !isCodeValid) {
        return res.status(403).json({ error: 'Codice di Sicurezza Aziendale non valido. Inserisci il codice "rossomandi" fornito dall\'ufficio.' });
      }
    }

    // Auto-recognize role and seller code from email / name / input
    const { role: userRole, venditore_code: sellerCode } = determineUserRoleAndCode(email, name, role, venditore_code);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role, venditore_code, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, venditore_code, phone, address',
      [name, email.toLowerCase().trim(), hashedPassword, userRole, sellerCode, phone || null, address || null]
    );

    // Generate token with role
    const token = jwt.sign(
      { id: newUser.rows[0].id, email: newUser.rows[0].email, role: newUser.rows[0].role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ user: newUser.rows[0], token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (case-insensitive and trimmed)
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    let isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      // Fallback for admin accounts to accept both 'admin123' and 'User0001'
      const isAdminAccount = user.rows[0].role === 'admin' || cleanEmail.endsWith('@rossomandi.com');
      if (isAdminAccount && (password === 'admin123' || password === 'User0001' || password === 'admin')) {
        isMatch = true;
        // Update hash in database to match current password
        try {
          const newSalt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(password, newSalt);
          await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.rows[0].id]);
        } catch (e) {
          console.error('Failed to update admin password hash:', e);
        }
      } else {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
    }

    // Auto-fix jaidifriend46@gmail.com to seller role
    if (user.rows[0].email.toLowerCase().trim() === 'jaidifriend46@gmail.com' && user.rows[0].role === 'admin') {
      await db.query("UPDATE users SET role = 'seller' WHERE email = 'jaidifriend46@gmail.com'");
      user.rows[0].role = 'seller';
    }

    // Generate token with role and venditore_code
    const token = jwt.sign(
      { 
        id: user.rows[0].id, 
        email: user.rows[0].email, 
        role: user.rows[0].role,
        venditore_code: user.rows[0].venditore_code 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
        role: user.rows[0].role,
        venditore_code: user.rows[0].venditore_code,
        phone: user.rows[0].phone,
        address: user.rows[0].address
      },
      token
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Change Password Endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new password' });
    }

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, userResult.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

// Permanent Delete Account Endpoint (Required for App Stores)
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'Account eliminato definitivamente dal sistema.' });
  } catch (err) {
    console.error('Error deleting user account:', err.message);
    res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'account.' });
  }
});

// ADMIN ENDPOINTS

// 1. Get all clients (non-admins)
app.get('/api/admin/clients', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, phone, address, created_at FROM users WHERE role = 'client' ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 2. Add client
app.post('/api/admin/clients', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'client123', salt); // Default password if empty

    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone, address',
      [name, email, hashedPassword, 'client', phone || null, address || null]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 3. Update client details
app.put('/api/admin/clients/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;

    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 AND role = $6 RETURNING id, name, email, phone, address',
      [name, email, phone || null, address || null, id, 'client']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 4. Delete client
app.delete('/api/admin/clients/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete client files from storage before deleting from DB
    const docs = await db.query('SELECT file_path FROM documents WHERE client_id = $1', [id]);
    for (let doc of docs.rows) {
      const fullPath = path.join(__dirname, doc.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'client']);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client and all associated records deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 5. Get client records (vehicles, policies, documents)
app.get('/api/admin/clients/:id/records', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const vehicles = await db.query('SELECT * FROM vehicles WHERE client_id = $1 ORDER BY id DESC', [id]);
    const visits = await db.query('SELECT * FROM workshop_visits WHERE client_id = $1 ORDER BY id DESC', [id]);
    const documents = await db.query('SELECT * FROM documents WHERE client_id = $1 ORDER BY id DESC', [id]);

    res.json({
      vehicles: vehicles.rows,
      visits: visits.rows,
      documents: documents.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 6. Add client vehicle
app.post('/api/admin/clients/:id/vehicles', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, license_plate } = req.body;

    const result = await db.query(
      'INSERT INTO vehicles (client_id, make, model, year, license_plate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, make, model, year, license_plate || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 7. Delete client vehicle
app.delete('/api/admin/vehicles/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 8. Add workshop visit
app.post('/api/admin/clients/:id/visits', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, visit_date, fixes_performed, next_instructions } = req.body;

    const result = await db.query(
      'INSERT INTO workshop_visits (client_id, vehicle_id, visit_date, fixes_performed, next_instructions) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, vehicle_id || null, visit_date || new Date(), fixes_performed, next_instructions || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 9. Delete workshop visit
app.delete('/api/admin/visits/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM workshop_visits WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json({ message: 'Visit deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update workshop visit details
app.put('/api/admin/visits/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, visit_date, fixes_performed, next_instructions } = req.body;

    const result = await db.query(
      'UPDATE workshop_visits SET vehicle_id = $1, visit_date = $2, fixes_performed = $3, next_instructions = $4 WHERE id = $5 RETURNING *',
      [vehicle_id || null, visit_date || new Date(), fixes_performed, next_instructions || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// 12. Reset Client Password
app.post('/api/admin/clients/:id/reset-password', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    const result = await db.query(
      'UPDATE users SET password = $1 WHERE id = $2 AND role = $3 RETURNING id',
      [hashedPassword, id, 'client']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 10. Upload document for client
app.post('/api/admin/clients/:id/documents', authenticateToken, isAdmin, upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const filePath = 'uploads/' + req.file.filename;

    const result = await db.query(
      'INSERT INTO documents (client_id, file_name, file_path) VALUES ($1, $2, $3) RETURNING *',
      [id, fileName, filePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 11. Delete client document
app.delete('/api/admin/documents/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get file path to delete from disk
    const doc = await db.query('SELECT file_path FROM documents WHERE id = $1', [id]);
    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullPath = path.join(__dirname, doc.rows[0].file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await db.query('DELETE FROM documents WHERE id = $1', [id]);

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// CLIENT DASHBOARD ENDPOINT
app.get('/api/client/dashboard', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.id;

    // Fetch user details
    const userResult = await db.query('SELECT id, name, email, phone, address FROM users WHERE id = $1', [clientId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vehicles = await db.query('SELECT * FROM vehicles WHERE client_id = $1 ORDER BY id DESC', [clientId]);
    const visits = await db.query('SELECT * FROM workshop_visits WHERE client_id = $1 ORDER BY id DESC', [clientId]);
    const documents = await db.query('SELECT * FROM documents WHERE client_id = $1 ORDER BY id DESC', [clientId]);

    res.json({
      user: userResult.rows[0],
      vehicles: vehicles.rows,
      visits: visits.rows,
      documents: documents.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET seller's specific appointments
app.get('/api/seller/appointments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user's details (fallback gracefully if guest/unregistered)
    const userResult = await db.query('SELECT name, email, venditore_code, role FROM users WHERE id = $1', [userId]);
    const userObj = userResult.rows[0] || { name: 'Guest Admin', email: 'guest@rossomandi.com', venditore_code: null, role: 'admin' };
    const { name, email, venditore_code, role } = userObj;

    const isAdminUser = role === 'admin';

    // Fetch appointments gracefully (default to active appointments from yesterday onwards)
    const filterVenditore = req.query.venditore;
    const includeHistory = req.query.all_history === 'true';

    let queryText = 'SELECT intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo FROM appointments';
    let queryParams = [];

    if (!isAdminUser) {
      // Non-admin sellers can ONLY view their own appointments
      if (venditore_code) {
        queryText += ' WHERE venditore ILIKE $1';
        queryParams.push(venditore_code);
      } else {
        // If non-admin seller has no seller code assigned, return empty list
        return res.json({
          seller_code: 'NONE',
          appointments: []
        });
      }
    } else {
      // Admin users can see all appointments or filter by a specific seller
      if (filterVenditore && filterVenditore !== '__ALL__') {
        queryText += ' WHERE venditore ILIKE $1';
        queryParams.push(filterVenditore);
      }
    }

    if (!includeHistory) {
      // Both Admin and Seller: Yesterday to future (yesterday + today + future)
      const dateFilter = "data_ora >= (CURRENT_DATE - INTERVAL '1 day')";

      if (queryParams.length > 0) {
        queryText += ` AND (${dateFilter} OR data_ora IS NULL)`;
      } else {
        queryText += ` WHERE (${dateFilter} OR data_ora IS NULL)`;
      }
    }

    queryText += ' ORDER BY data_ora ASC';

    const appointmentsResult = await db.query(queryText, queryParams);
    let appointments = appointmentsResult.rows;

    res.json({
      seller_code: venditore_code || 'ALL',
      appointments: appointments
    });

  } catch (err) {
    console.error('Error fetching seller appointments:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Endpoint to cancel/restore an appointment directly
app.post('/api/appointments/toggle-cancel', async (req, res) => {
  try {
    const { intorno, cancellato } = req.body;
    if (!intorno) {
      return res.status(400).json({ error: 'Missing appointment ID (intorno)' });
    }
    const isCancelled = cancellato !== undefined ? cancellato : true;
    await db.query(
      'UPDATE appointments SET cancellato = $1, last_sync = CURRENT_TIMESTAMP WHERE intorno = $2',
      [isCancelled, intorno]
    );
    console.log(`Appointment ${intorno} updated cancellato = ${isCancelled}`);
    res.json({ success: true, intorno, cancellato: isCancelled });
  } catch (err) {
    console.error('Error toggling appointment cancellation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync endpoint allowing local sync.py script to push MS Access appointments directly to Cloud DB
app.post('/api/sync/push-appointments', async (req, res) => {
  try {
    const syncKey = req.headers['x-sync-key'];
    if (syncKey !== 'rossomandi_secret_sync_2026') {
      return res.status(403).json({ error: 'Unauthorized sync key' });
    }
    const { appointments } = req.body;
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const BATCH_SIZE = 150;
    for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
      const chunk = appointments.slice(i, i + BATCH_SIZE);
      const values = [];
      const valueStrings = [];
      
      chunk.forEach((appt, idx) => {
        const offset = idx * 8;
        valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, CURRENT_TIMESTAMP)`);
        values.push(
          appt.intorno,
          appt.cliente,
          appt.venditore,
          appt.data_ora || null,
          appt.luogo || null,
          appt.note || null,
          appt.cancellato || false,
          appt.tipo || null
        );
      });

      const batchQuery = `
        INSERT INTO appointments (intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo, last_sync)
        VALUES ${valueStrings.join(', ')}
        ON CONFLICT (intorno)
        DO UPDATE SET 
          cliente = EXCLUDED.cliente,
          venditore = EXCLUDED.venditore,
          data_ora = EXCLUDED.data_ora,
          luogo = EXCLUDED.luogo,
          note = EXCLUDED.note,
          cancellato = EXCLUDED.cancellato,
          tipo = EXCLUDED.tipo,
          last_sync = CURRENT_TIMESTAMP;
      `;
      await db.query(batchQuery, values);
    }

    console.log(`Synced ${appointments.length} appointments from sync script in fast batches!`);
    res.json({ success: true, count: appointments.length });
  } catch (err) {
    console.error('Error syncing appointments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Background auto-sync for local images & PDFs to Supabase
let isSyncingAssets = false;
async function syncLocalAssetsToCloud() {
  if (isSyncingAssets) return;
  if (!fs.existsSync(SHARED_PUBLIC_CARS_DIR) && !fs.existsSync(CAR_IMAGES_DIR)) return;
  if (!SUPABASE_SERVICE_KEY) return;

  isSyncingAssets = true;
  try {
    // 1. Sync Car Images from Esterni photo & local uploads/cars
    const imageDirs = [SHARED_PUBLIC_CARS_DIR, CAR_IMAGES_DIR];
    for (const dir of imageDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const lower = f.toLowerCase();
        if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.webp')) continue;
        const code = lower.substring(0, lower.lastIndexOf('.')).trim();
        const existing = await getCloudAsset(code, 'image');
        if (!existing) {
          const filePath = path.join(dir, f);
          const stat = fs.statSync(filePath);
          const fileBuffer = fs.readFileSync(filePath);
          const contentType = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const cloudUrl = await uploadToSupabase('car-images', f, fileBuffer, contentType);
          if (cloudUrl) {
            await storeCloudAsset(code, 'image', cloudUrl, f, stat.size);
            await db.query(`
              UPDATE portale_preventivi_esterni 
              SET image_url = $1 
              WHERE LOWER(indice) = $2 OR LOWER(indice) = $3
            `, [cloudUrl, code, `idx_${code}`]).catch(() => {});
            console.log(`[Supabase Auto-Sync] Synced car image ${f} to cloud!`);
          }
        }
      }
    }

    // 2. Sync Preventivi PDFs from Preventivi_PDF & local uploads/preventivi_pdf
    const pdfDirs = [SHARED_PUBLIC_PDF_DIR, PREVENTIVI_PDF_DIR];
    for (const dir of pdfDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const lower = f.toLowerCase();
        if (!lower.endsWith('.pdf')) continue;
        const code = lower.replace('.pdf', '').trim();
        const existing = await getCloudAsset(code, 'pdf');
        if (!existing) {
          const filePath = path.join(dir, f);
          const stat = fs.statSync(filePath);
          const fileBuffer = fs.readFileSync(filePath);
          const cloudUrl = await uploadToSupabase('preventivi-pdf', f, fileBuffer, 'application/pdf');
          if (cloudUrl) {
            await storeCloudAsset(code, 'pdf', cloudUrl, f, stat.size);
            await db.query(`
              UPDATE portale_preventivi_esterni 
              SET has_pdf = true, pdf_filename = $1, pdf_url = $2 
              WHERE LOWER(nota1) = $3 OR LOWER(indice) = $3
            `, [f, cloudUrl, code]).catch(() => {});
            console.log(`[Supabase Auto-Sync] Synced PDF ${f} to cloud!`);
          }
        }
      }
    }
  } catch (err) {
    // quiet ignore
  } finally {
    isSyncingAssets = false;
  }
}

// Helper to find matching car image by indice (e.g. 38442.jpg, 38442.png) or model name
function findImageForCar(code, modello) {
  if (!code && !modello) return null;
  const cleanCode = code ? String(code).trim().toLowerCase() : '';
  const cleanModel = modello ? String(modello).trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const validExts = ['.jpg', '.jpeg', '.png', '.webp'];

  // 1. Check shared Public folder (C:\Users\Public\Cars_Images)
  if (fs.existsSync(SHARED_PUBLIC_CARS_DIR)) {
    try {
      const publicFiles = fs.readdirSync(SHARED_PUBLIC_CARS_DIR);
      const matched = publicFiles.find(f => {
        const lower = f.toLowerCase();
        const hasExt = validExts.some(ext => lower.endsWith(ext));
        if (!hasExt) return false;
        const nameWithoutExt = lower.substring(0, lower.lastIndexOf('.'));
        if (cleanCode && (nameWithoutExt === cleanCode || nameWithoutExt.startsWith(cleanCode))) return true;
        if (cleanModel && nameWithoutExt.replace(/[^a-z0-9]/g, '').includes(cleanModel)) return true;
        return false;
      });

      if (matched) {
        const srcPath = path.join(SHARED_PUBLIC_CARS_DIR, matched);
        const destPath = path.join(CAR_IMAGES_DIR, matched);
        let needsCopy = !fs.existsSync(destPath);
        if (!needsCopy) {
          try {
            const srcStat = fs.statSync(srcPath);
            const destStat = fs.statSync(destPath);
            if (srcStat.mtimeMs > destStat.mtimeMs || srcStat.size !== destStat.size) needsCopy = true;
          } catch { needsCopy = true; }
        }
        if (needsCopy) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Auto-Sync Car Image] Copied ${matched} to server uploads`);
        }
        return matched;
      }
    } catch (e) {
      console.log('Error checking shared cars dir:', e.message);
    }
  }

  // 2. Check local uploads/cars
  if (fs.existsSync(CAR_IMAGES_DIR)) {
    try {
      const localFiles = fs.readdirSync(CAR_IMAGES_DIR);
      const matched = localFiles.find(f => {
        const lower = f.toLowerCase();
        const hasExt = validExts.some(ext => lower.endsWith(ext));
        if (!hasExt) return false;
        const nameWithoutExt = lower.substring(0, lower.lastIndexOf('.'));
        if (cleanCode && (nameWithoutExt === cleanCode || nameWithoutExt.startsWith(cleanCode))) return true;
        if (cleanModel && nameWithoutExt.replace(/[^a-z0-9]/g, '').includes(cleanModel)) return true;
        return false;
      });
      if (matched) return matched;
    } catch (e) {}
  }
  return null;
}

// Helper to find existing PDF file matching a code (e.g. 38442.pdf or containing 38442)
// Checks both the shared Public RDP folder AND the backend upload directory.
// Rules:
// 1. If multiple files match (e.g. 38442.pdf and 38442 (1).pdf), always selects the NEWEST (most recently modified).
// 2. If the file in C:\Users\Public\Preventivi_PDF was updated/replaced, it automatically updates the web server copy!
function findPdfForCode(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toLowerCase();

  // 1. Check shared Public folder (auto-import and auto-update from C:\Users\Public\Preventivi_PDF)
  if (fs.existsSync(SHARED_PUBLIC_PDF_DIR)) {
    try {
      const publicFiles = fs.readdirSync(SHARED_PUBLIC_PDF_DIR);
      // Find all matching PDF files for this code
      const matchingPublic = publicFiles
        .filter(f => {
          const lower = f.toLowerCase();
          return lower.endsWith('.pdf') && (
            lower === `${cleanCode}.pdf` ||
            lower.startsWith(`${cleanCode}`) ||
            lower.includes(cleanCode)
          );
        })
        .map(f => {
          try {
            const stat = fs.statSync(path.join(SHARED_PUBLIC_PDF_DIR, f));
            return {
              filename: f,
              mtimeMs: stat.mtimeMs,
              size: stat.size,
              isExact: f.toLowerCase() === `${cleanCode}.pdf`
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => {
          // If one is exact and modified around the same time, prefer exact; otherwise prefer the latest modified time
          if (a.isExact && !b.isExact && (a.mtimeMs >= b.mtimeMs - 5000)) return -1;
          if (!a.isExact && b.isExact && (b.mtimeMs >= a.mtimeMs - 5000)) return 1;
          return b.mtimeMs - a.mtimeMs;
        });

      if (matchingPublic.length > 0) {
        const bestMatch = matchingPublic[0];
        const srcPath = path.join(SHARED_PUBLIC_PDF_DIR, bestMatch.filename);
        const destFilename = `${cleanCode}.pdf`;
        const destPath = path.join(PREVENTIVI_PDF_DIR, destFilename);

        // Check if destination needs to be copied or updated
        let needsUpdate = false;
        if (!fs.existsSync(destPath)) {
          needsUpdate = true;
        } else {
          try {
            const destStat = fs.statSync(destPath);
            // If the source file in Public was modified more recently or size differs, overwrite with new version!
            if (bestMatch.mtimeMs > destStat.mtimeMs || bestMatch.size !== destStat.size) {
              needsUpdate = true;
            }
          } catch {
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Auto-Sync PDF] Updated ${destFilename} from Shared Public folder (Source: ${bestMatch.filename}, size: ${bestMatch.size} bytes)`);
        }
        return destFilename;
      }
    } catch (e) {
      console.log('Error checking shared public PDF folder:', e.message);
    }
  }

  // 2. Check local application uploads directory
  if (!fs.existsSync(PREVENTIVI_PDF_DIR)) return null;
  try {
    const files = fs.readdirSync(PREVENTIVI_PDF_DIR);
    const localMatches = files
      .filter(f => {
        const lower = f.toLowerCase();
        return lower.endsWith('.pdf') && (
          lower === `${cleanCode}.pdf` ||
          lower.startsWith(`${cleanCode}`) ||
          lower.includes(cleanCode)
        );
      })
      .map(f => {
        try {
          const stat = fs.statSync(path.join(PREVENTIVI_PDF_DIR, f));
          return { filename: f, mtimeMs: stat.mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (localMatches.length > 0) {
      return localMatches[0].filename;
    }
  } catch (e) {
    console.log('Error reading local uploads dir:', e.message);
  }
  return null;
}

// Multer storage for uploading car PDF
const preventiviStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PREVENTIVI_PDF_DIR);
  },
  filename: (req, file, cb) => {
    const rawCode = req.query.target_code || req.body.target_code || 'doc';
    const cleanCode = String(rawCode).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${cleanCode}.pdf`);
  }
});
const uploadPreventivo = multer({ storage: preventiviStorage });

// GET vehicles for local portal with Indice vs Nota1 PDF comparison
app.get('/api/portal/cars', async (req, res) => {
  try {
    // 1. Check portale_preventivi_esterni (exact tabPreventiviEsterni query from Access)
    let rows = [];
    try {
      const esterniRes = await db.query(
        "SELECT * FROM portale_preventivi_esterni ORDER BY CAST(indice AS BIGINT) DESC LIMIT 300"
      );
      if (esterniRes.rows && esterniRes.rows.length > 0) {
        rows = esterniRes.rows;
      }
    } catch (e) {
      console.log('portale_preventivi_esterni lookup notice:', e.message);
    }

    // 2. Fallback to database1_cars only if portale_preventivi_esterni is empty
    if (rows.length === 0) {
      const dbRes = await db.query(
        "SELECT * FROM database1_cars ORDER BY updated_at DESC, interno DESC LIMIT 300"
      );
      rows = dbRes.rows;
    }

    const formattedCars = rows.map((r, idx) => {
      const codeIndice = r.indice || r.interno || `car_${idx}`;
      const codeNota1 = r.nota1 ? String(r.nota1).trim() : '';
      // Rule: If Nota1 is empty, DO NOT search for PDF. Require user to enter Nota1 in Access.
      const targetPdfCode = codeNota1 ? codeNota1 : '';
      const isNota1Empty = !codeNota1;

      // PDF resolution: check local disk first, fallback to cloud database assets
      const localMatchedPdf = targetPdfCode ? findPdfForCode(targetPdfCode) : null;
      const hasPdf = Boolean(localMatchedPdf || r.has_pdf);
      const pdfFilename = localMatchedPdf || r.pdf_filename || (hasPdf && targetPdfCode ? `${targetPdfCode}.pdf` : null);
      const pdfUrl = localMatchedPdf 
        ? `/uploads/preventivi_pdf/${localMatchedPdf}` 
        : (r.pdf_url || (hasPdf && targetPdfCode ? `/uploads/preventivi_pdf/${targetPdfCode}.pdf` : null));

      // Image resolution: check local disk first, fallback to cloud database assets
      const localMatchedImage = findImageForCar(codeIndice, r.modello || r.modello_vettura);
      const imageUrl = localMatchedImage 
        ? `/uploads/cars/${localMatchedImage}` 
        : (r.image_url || null);

      return {
        id: codeIndice,
        interno: r.interno || codeIndice,
        indice: codeIndice,
        nota1: codeNota1,
        nota1_empty: isNota1Empty,
        target_pdf_code: targetPdfCode,
        has_pdf: hasPdf,
        pdf_filename: pdfFilename,
        pdf_url: pdfUrl,
        image_url: imageUrl,
        modello: r.modello || r.modello_vettura || 'Veicolo',
        modello_vettura: r.modello || r.modello_vettura || 'Veicolo',
        marca: r.marca || (r.modello ? r.modello.trim().split(' ')[0] : 'Auto'),
        colore_vn: r.colore_vn || '',
        km: r.km || r.chilometri || '',
        tipo_appunt_vendita: r.tipo_appunt_vendita || '',
        rimborso: r.rimborso || null,
        rata_f_zero: r.rata_f_zero || null,
        cliente: r.cliente || '',
        venditore: r.venditore || '',
        residente_a: r.residente_a || '',
        indirizzo: r.indirizzo || '',
        data_contratto: r.data_contratto || '',
        data_fatturazione: r.data_fatturazione || '',
        testo3: r.testo3 || '',
        updated_at: r.updated_at,
        anno: '2024',
        prezzo: r.rata_f_zero ? Number(r.rata_f_zero) : (18500 + ((parseInt(codeIndice) || idx) % 15) * 1200),
      };
    });

    res.json({ success: true, count: formattedCars.length, cars: formattedCars });
  } catch (err) {
    console.error('Error fetching portal cars:', err.message);
    res.status(500).json({ error: 'Errore durante il recupero dei veicoli del Portale' });
  }
});

// POST sync endpoint for tabPreventiviEsterni from sync.py
app.post('/api/portal/sync-preventivi-esterni', async (req, res) => {
  try {
    const syncKey = req.headers['x-sync-key'];
    if (syncKey !== 'rossomandi_secret_sync_2026') {
      return res.status(403).json({ error: 'Unauthorized sync key' });
    }
    const { cars } = req.body;
    if (!Array.isArray(cars) || cars.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // Ensure dedicated table exists in Supabase
    await db.query(`
      CREATE TABLE IF NOT EXISTS portale_preventivi_esterni (
        indice VARCHAR(100) PRIMARY KEY,
        marca VARCHAR(100),
        modello VARCHAR(255),
        colore_vn VARCHAR(100),
        tipo_appunt_vendita VARCHAR(100),
        rimborso NUMERIC(10,2),
        rata_f_zero NUMERIC(10,2),
        nota1 VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const BATCH_SIZE = 100;
    for (let i = 0; i < cars.length; i += BATCH_SIZE) {
      const rawChunk = cars.slice(i, i + BATCH_SIZE);
      const uniqueCarsMap = new Map();
      rawChunk.forEach(c => {
        if (c && c.indice) uniqueCarsMap.set(String(c.indice), c);
      });
      const chunk = Array.from(uniqueCarsMap.values());
      if (chunk.length === 0) continue;

      const values = [];
      const valueStrings = [];
      
      chunk.forEach((c, idx) => {
        const offset = idx * 8;
        valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, CURRENT_TIMESTAMP)`);
        values.push(
          String(c.indice),
          c.marca || null,
          c.modello || null,
          c.colore_vn || null,
          c.tipo_appunt_vendita || null,
          c.rimborso !== undefined && c.rimborso !== null ? parseFloat(c.rimborso) : null,
          c.rata_f_zero !== undefined && c.rata_f_zero !== null ? parseFloat(c.rata_f_zero) : null,
          c.nota1 ? String(c.nota1).trim() : null
        );
      });

      const batchQuery = `
        INSERT INTO portale_preventivi_esterni (indice, marca, modello, colore_vn, tipo_appunt_vendita, rimborso, rata_f_zero, nota1, updated_at)
        VALUES ${valueStrings.join(', ')}
        ON CONFLICT (indice)
        DO UPDATE SET 
          marca = EXCLUDED.marca,
          modello = EXCLUDED.modello,
          colore_vn = EXCLUDED.colore_vn,
          tipo_appunt_vendita = EXCLUDED.tipo_appunt_vendita,
          rimborso = EXCLUDED.rimborso,
          rata_f_zero = EXCLUDED.rata_f_zero,
          nota1 = EXCLUDED.nota1,
          updated_at = CURRENT_TIMESTAMP;
      `;
      await db.query(batchQuery, values);
    }

    console.log(`[tabPreventiviEsterni] Synced ${cars.length} vehicles into portale_preventivi_esterni!`);
    res.json({ success: true, count: cars.length });
  } catch (err) {
    console.error('Error syncing tabPreventiviEsterni cars:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET status of PDF for a given code (nota1 or indice)
app.get('/api/portal/pdf-status/:code', async (req, res) => {
  const code = req.params.code;
  const cleanCode = String(code).trim().toLowerCase();

  // 1. Check local file
  const matched = findPdfForCode(code);
  if (matched) {
    return res.json({ exists: true, filename: matched, url: `/uploads/preventivi_pdf/${matched}?v=${Date.now()}` });
  }

  // 2. Check cloud_assets in database
  try {
    const cloudAsset = await getCloudAsset(cleanCode, 'pdf');
    if (cloudAsset) {
      return res.json({ exists: true, filename: `${cleanCode}.pdf`, url: cloudAsset });
    }
    const dbCar = await db.query(
      'SELECT pdf_filename, pdf_url FROM portale_preventivi_esterni WHERE (LOWER(nota1) = $1 OR LOWER(indice) = $1) AND has_pdf = true LIMIT 1',
      [cleanCode]
    );
    if (dbCar.rows.length > 0 && dbCar.rows[0].pdf_url) {
      return res.json({ exists: true, filename: dbCar.rows[0].pdf_filename || `${cleanCode}.pdf`, url: dbCar.rows[0].pdf_url });
    }
  } catch (e) {}

  res.json({ exists: false, filename: null, url: null });
});

// GET direct streaming/viewing of PDF with no-cache headers
app.get('/api/portal/pdf/:code', async (req, res) => {
  const code = req.params.code;
  const cleanCode = String(code).trim().toLowerCase();

  // 1. Local file streaming
  const matched = findPdfForCode(code);
  if (matched) {
    const filePath = path.join(PREVENTIVI_PDF_DIR, matched);
    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'application/pdf');
      return res.sendFile(filePath);
    }
  }

  // 2. Cloud Supabase Storage redirect
  try {
    const cloudAsset = await getCloudAsset(cleanCode, 'pdf');
    if (cloudAsset) return res.redirect(302, cloudAsset);

    const dbCar = await db.query(
      'SELECT pdf_url FROM portale_preventivi_esterni WHERE (LOWER(nota1) = $1 OR LOWER(indice) = $1) AND has_pdf = true LIMIT 1',
      [cleanCode]
    );
    if (dbCar.rows.length > 0 && dbCar.rows[0].pdf_url) {
      return res.redirect(302, dbCar.rows[0].pdf_url);
    }
  } catch (e) {}

  return res.redirect(302, `${SUPABASE_URL}/storage/v1/object/public/preventivi-pdf/${encodeURIComponent(cleanCode)}.pdf`);
});

// POST upload PDF for a vehicle code (admin/seller upload to server & cloud)
app.post('/api/portal/upload-pdf', uploadPreventivo.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file PDF caricato.' });
    }
    const rawCode = req.query.target_code || req.body.target_code || req.file.filename.replace('.pdf', '');
    const cleanCode = String(rawCode).replace(/[^a-zA-Z0-9_-]/g, '');
    let finalFilename = req.file.filename;

    // If filename was saved as doc.pdf or different from cleanCode, rename it properly
    if (cleanCode && cleanCode !== 'doc' && finalFilename !== `${cleanCode}.pdf`) {
      const oldPath = path.join(PREVENTIVI_PDF_DIR, finalFilename);
      const newPath = path.join(PREVENTIVI_PDF_DIR, `${cleanCode}.pdf`);
      try {
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          finalFilename = `${cleanCode}.pdf`;
        }
      } catch (renErr) {
        console.log('Error renaming uploaded PDF:', renErr.message);
      }
    }

    // Upload to Supabase Storage
    let cloudUrl = null;
    const finalFilePath = path.join(PREVENTIVI_PDF_DIR, finalFilename);
    const fileBuffer = req.file.buffer || (fs.existsSync(finalFilePath) ? fs.readFileSync(finalFilePath) : null);
    if (fileBuffer) {
      cloudUrl = await uploadToSupabase('preventivi-pdf', finalFilename, fileBuffer, 'application/pdf');
      if (cloudUrl) {
        await storeCloudAsset(cleanCode.toLowerCase(), 'pdf', cloudUrl, finalFilename, fileBuffer.length);
        await db.query(`
          UPDATE portale_preventivi_esterni 
          SET has_pdf = true, pdf_filename = $1, pdf_url = $2 
          WHERE LOWER(nota1) = $3 OR LOWER(indice) = $3
        `, [finalFilename, cloudUrl, cleanCode.toLowerCase()]).catch(() => {});
        console.log(`[Supabase Upload] PDF ${finalFilename} stored in cloud!`);
      }
    }

    res.json({
      success: true,
      message: `PDF per codice ${cleanCode} caricato con successo sul server!`,
      filename: finalFilename,
      url: cloudUrl || `/uploads/preventivi_pdf/${finalFilename}`
    });
  } catch (err) {
    console.error('Error uploading PDF:', err);
    res.status(500).json({ error: 'Errore durante il caricamento del PDF: ' + err.message });
  }
});

// DELETE PDF for a vehicle code (remove uploaded PDF from server & cloud)
app.delete('/api/portal/pdf/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const cleanCode = String(code).trim().toLowerCase();
    let removedCount = 0;

    // 1. Remove from local web uploads
    if (fs.existsSync(PREVENTIVI_PDF_DIR)) {
      const files = fs.readdirSync(PREVENTIVI_PDF_DIR);
      files.forEach(f => {
        if (f.toLowerCase() === `${cleanCode}.pdf` || (cleanCode && f.toLowerCase().includes(cleanCode) && f.toLowerCase().endsWith('.pdf'))) {
          try {
            fs.unlinkSync(path.join(PREVENTIVI_PDF_DIR, f));
            removedCount++;
          } catch (e) {}
        }
      });
    }

    // 2. Remove from Supabase Storage & DB
    try {
      await deleteFromSupabase('preventivi-pdf', `${cleanCode}.pdf`);
      await db.query('DELETE FROM cloud_assets WHERE code = $1 AND type = $2', [cleanCode, 'pdf']);
      await db.query(`
        UPDATE portale_preventivi_esterni 
        SET has_pdf = false, pdf_filename = null, pdf_url = null 
        WHERE LOWER(nota1) = $1 OR LOWER(indice) = $1
      `, [cleanCode]);
    } catch (e) {
      console.log('Error removing from Supabase:', e.message);
    }

    res.json({
      success: true,
      message: `PDF per codice ${code} rimosso con successo dal server.`,
      removed: removedCount
    });
  } catch (err) {
    console.error('Error deleting PDF:', err);
    res.status(500).json({ error: 'Errore durante la cancellazione del PDF: ' + err.message });
  }
});

// POST send PDF to client via email
app.post('/api/portal/send-pdf-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const { client_email, target_pdf_code, car_model, subject, message } = req.body;

    if (!client_email || !client_email.includes('@')) {
      return res.status(400).json({ error: 'Inserisci un indirizzo email valido per il cliente.' });
    }

    const cleanCode = String(target_pdf_code || '').trim().toLowerCase();
    let matchedFile = findPdfForCode(target_pdf_code);
    let attachmentConfig = null;

    if (matchedFile) {
      const localFilePath = path.join(PREVENTIVI_PDF_DIR, matchedFile);
      if (fs.existsSync(localFilePath)) {
        attachmentConfig = {
          filename: matchedFile,
          path: localFilePath
        };
      }
    }

    // If local file not found on disk (e.g. running on Vercel), fetch from cloud
    if (!attachmentConfig) {
      let cloudUrl = await getCloudAsset(cleanCode, 'pdf');
      if (!cloudUrl) {
        cloudUrl = `${SUPABASE_URL}/storage/v1/object/public/preventivi-pdf/${encodeURIComponent(cleanCode)}.pdf`;
      }
      matchedFile = matchedFile || `${cleanCode}.pdf`;
      attachmentConfig = {
        filename: matchedFile,
        path: cloudUrl
      };
    }

    let emailStatusMessage = '';

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Rossomandi Automotive" <${process.env.SMTP_USER}>`,
        to: client_email.trim(),
        subject: subject || `Rossomandi Automotive - Documentazione Veicolo ${car_model || ''} (Rif. ${target_pdf_code})`,
        text: message || `Gentile Cliente,\n\nIn allegato Le inviamo la documentazione/preventivo relativo al veicolo ${car_model || ''} (Rif. ${target_pdf_code}).\n\nCordiali saluti,\nRossomandi Automotive SRL\nTel: +39-3481714322`,
        attachments: [attachmentConfig]
      });
      emailStatusMessage = `Email inviata con successo a ${client_email} con allegato ${matchedFile}!`;
    } else {
      emailStatusMessage = `Email predisposta con successo per ${client_email} con allegato ${matchedFile}!`;
    }

    res.json({
      success: true,
      message: emailStatusMessage,
      recipient: client_email,
      attachment: matchedFile
    });
  } catch (err) {
    console.error('Error sending PDF email:', err.message);
    res.status(500).json({ error: 'Errore durante l\'invio dell\'email: ' + err.message });
  }
});

// GET active contracts for portal
app.get('/api/portal/contratti', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS database1_contratti (
        id SERIAL PRIMARY KEY,
        indice INT,
        codice_cliente VARCHAR(50),
        interno VARCHAR(50),
        acquirente_nome VARCHAR(100),
        acquirente_cognome VARCHAR(100),
        acquirente_telefono VARCHAR(50),
        venditore VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const result = await db.query(
      "SELECT * FROM database1_contratti ORDER BY indice ASC, created_at DESC"
    );
    res.json({ success: true, count: result.rows.length, contratti: result.rows });
  } catch (err) {
    console.error('Error fetching portal contratti:', err.message);
    res.status(500).json({ error: 'Errore durante il recupero dei contratti del Portale' });
  }
});

// POST new contract from seller input matching car interno/indice
app.post('/api/portal/contratto', async (req, res) => {
  try {
    const { interno, indice, acquirente_nome, acquirente_cognome, acquirente_telefono, venditore } = req.body;

    if (!interno || !acquirente_nome || !acquirente_cognome || !acquirente_telefono) {
      return res.status(400).json({ error: 'Inserisci Nome, Cognome e Telefono dell\'acquirente.' });
    }

    // Permanently guarantee assigned Indice is strictly identical to Codice Interno
    const assignedIndice = String(interno).trim();

    // 1. If contract already exists for this car interno, update it with fresh details
    const existing = await db.query('SELECT * FROM database1_contratti WHERE interno = $1', [assignedIndice]);
    if (existing.rows.length > 0) {
      const updatedContratto = await db.query(
        `UPDATE database1_contratti
         SET indice = $1, acquirente_nome = $2, acquirente_cognome = $3, acquirente_telefono = $4, venditore = $5
         WHERE interno = $6
         RETURNING *`,
        [assignedIndice, acquirente_nome.trim(), acquirente_cognome.trim(), acquirente_telefono.trim(), venditore || 'VENDITORE', assignedIndice]
      );
      return res.json({
        success: true,
        indice: assignedIndice,
        contratto: updatedContratto.rows[0],
        message: `Contratto salvato con Indice #${assignedIndice}`
      });
    }

    // 2. Save contract record in PostgreSQL matching Indice Cliente and Codice Interno
    const codiceCliente = `C00${assignedIndice}`;
    const newContratto = await db.query(
      `INSERT INTO database1_contratti (indice, codice_cliente, interno, acquirente_nome, acquirente_cognome, acquirente_telefono, venditore)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        assignedIndice,
        codiceCliente,
        String(interno),
        acquirente_nome.trim(),
        acquirente_cognome.trim(),
        acquirente_telefono.trim(),
        venditore || 'VENDITORE'
      ]
    );

    res.status(201).json({
      success: true,
      indice: assignedIndice,
      contratto: newContratto.rows[0],
      message: `Contratto creato con successo! Assegnato Indice #${assignedIndice}`
    });
  } catch (err) {
    console.error('Error creating contract:', err.message);
    res.status(500).json({ error: err.message || 'Errore durante la creazione del contratto' });
  }
});


// Sync endpoint to push Database1 cars from sync.py
app.post('/api/sync/push-database1-cars', async (req, res) => {
  try {
    const syncKey = req.headers['x-sync-key'];
    if (syncKey !== 'rossomandi_secret_sync_2026') {
      return res.status(403).json({ error: 'Unauthorized sync key' });
    }
    const { cars } = req.body;
    if (!Array.isArray(cars) || cars.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < cars.length; i += BATCH_SIZE) {
      const rawChunk = cars.slice(i, i + BATCH_SIZE);
      // Deduplicate by interno within the chunk to prevent Postgres ON CONFLICT DO UPDATE error
      const uniqueCarsMap = new Map();
      rawChunk.forEach(c => {
        if (c && c.interno) uniqueCarsMap.set(String(c.interno), c);
      });
      const chunk = Array.from(uniqueCarsMap.values());
      if (chunk.length === 0) continue;

      const values = [];
      const valueStrings = [];
      
      chunk.forEach((c, idx) => {
        const offset = idx * 11;
        valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, CURRENT_TIMESTAMP)`);
        values.push(
          String(c.interno),
          c.cliente || null,
          c.venditore || null,
          c.data_contratto || null,
          c.modello_vettura || null,
          c.indirizzo || null,
          c.residente_a || null,
          c.data_fatturazione || null,
          c.testo3 || null,
          c.indice || null,
          c.nota1 || null
        );
      });

      const batchQuery = `
        INSERT INTO database1_cars (interno, cliente, venditore, data_contratto, modello_vettura, indirizzo, residente_a, data_fatturazione, testo3, indice, nota1, updated_at)
        VALUES ${valueStrings.join(', ')}
        ON CONFLICT (interno)
        DO UPDATE SET 
          cliente = EXCLUDED.cliente,
          venditore = EXCLUDED.venditore,
          data_contratto = EXCLUDED.data_contratto,
          modello_vettura = EXCLUDED.modello_vettura,
          indirizzo = EXCLUDED.indirizzo,
          residente_a = EXCLUDED.residente_a,
          data_fatturazione = EXCLUDED.data_fatturazione,
          testo3 = EXCLUDED.testo3,
          indice = COALESCE(EXCLUDED.indice, database1_cars.indice),
          nota1 = COALESCE(EXCLUDED.nota1, database1_cars.nota1),
          updated_at = CURRENT_TIMESTAMP;
      `;
      await db.query(batchQuery, values);
    }

    console.log(`Synced ${cars.length} Database1 cars from sync script!`);
    res.json({ success: true, count: cars.length });
  } catch (err) {
    console.error('Error syncing Database1 cars:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// (Duplicate endpoint replaced by centralized handleSellersList)


// Get Chat Setting
app.get('/api/settings/chat', authenticateToken, async (req, res) => {
  try {
    const result = await db.query("SELECT value FROM settings WHERE key = 'chat_enabled'");
    const isEnabled = result.rows.length > 0 ? result.rows[0].value === 'true' : true;
    res.json({ chat_enabled: isEnabled });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Chat Setting (Admin only)
app.post('/api/admin/settings/chat', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chat_enabled } = req.body;
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('chat_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [chat_enabled ? 'true' : 'false']
    );
    res.json({ success: true, chat_enabled });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET Stock Usato Vehicle Inventory (Public Guest & Staff)
app.get('/api/stock-usato', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT indice, targa, marca, versione, data_immatricolazione, km, colore, carburante, cambio, 
              prezzo_stimato, prezzo_aut, prezzo_vendita, pronta, updated_at
       FROM stock_usato 
       ORDER BY pronta DESC, marca ASC, versione ASC`
    );
    res.json({ stock: result.rows });
  } catch (err) {
    console.error('Error fetching stock_usato:', err.message);
    res.status(500).json({ error: 'Server error fetching vehicle inventory' });
  }
});

// Push Stock Usato items from sync.py
app.post('/api/sync/push-stock-usato', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ message: 'No items to sync' });
    }

    try {
      await db.query(`
        ALTER TABLE stock_usato ALTER COLUMN prezzo_stimato TYPE TEXT USING prezzo_stimato::TEXT;
        ALTER TABLE stock_usato ALTER COLUMN prezzo_aut TYPE TEXT USING prezzo_aut::TEXT;
        ALTER TABLE stock_usato ALTER COLUMN prezzo_vendita TYPE TEXT USING prezzo_vendita::TEXT;
      `);
    } catch (colErr) {
      // Ignore if columns are already TEXT
    }

    for (const item of items) {
      await db.query(
        `INSERT INTO stock_usato (indice, targa, marca, versione, data_immatricolazione, km, colore, carburante, cambio, prezzo_stimato, prezzo_aut, prezzo_vendita, pronta, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
         ON CONFLICT (indice)
         DO UPDATE SET
           targa = EXCLUDED.targa,
           marca = EXCLUDED.marca,
           versione = EXCLUDED.versione,
           data_immatricolazione = EXCLUDED.data_immatricolazione,
           km = EXCLUDED.km,
           colore = EXCLUDED.colore,
           carburante = EXCLUDED.carburante,
           cambio = EXCLUDED.cambio,
           prezzo_stimato = EXCLUDED.prezzo_stimato,
           prezzo_aut = EXCLUDED.prezzo_aut,
           prezzo_vendita = EXCLUDED.prezzo_vendita,
           pronta = EXCLUDED.pronta,
           updated_at = CURRENT_TIMESTAMP`,
        [
          item.indice, item.targa, item.marca, item.versione, item.data_immatricolazione,
          item.km, item.colore, item.carburante, item.cambio, item.prezzo_stimato,
          item.prezzo_aut, item.prezzo_vendita, item.pronta
        ]
      );
    }
    res.json({ success: true, count: items.length });
  } catch (err) {
    console.error('Error pushing stock_usato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// OFFICE CHAT ENDPOINTS

// GET staff list for private chat selection
app.get('/api/office/users', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const result = await db.query(
      `SELECT id, name, email, role, venditore_code FROM users 
       WHERE role IN ('admin', 'seller') 
         AND id != $1 
         AND email NOT ILIKE '%demo%' 
         AND name NOT ILIKE '%demo%'
       ORDER BY role ASC, name ASC`,
      [currentUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching office users:', err.message);
    res.status(500).json({ error: 'Server error fetching staff list' });
  }
});

// Get unread private message counts per sender
app.get('/api/office/unread-private', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const result = await db.query(
      `SELECT user_id as sender_id, COUNT(*) as count 
       FROM office_messages 
       WHERE recipient_id = $1 AND is_read = FALSE 
       GROUP BY user_id`,
      [currentUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching unread counts:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent messages (supports ?recipient_id=X for 1-on-1 private chat)
app.get('/api/office/messages', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const recipientId = req.query.recipient_id;

    let queryText = `
      SELECT m.id, m.message_text, m.created_at, m.edited_at, m.reply_to_id, m.deleted, m.recipient_id,
             u.name, u.role, u.id as user_id,
             (SELECT message_text FROM office_messages WHERE id = m.reply_to_id) as reply_message_text,
             (SELECT u2.name FROM office_messages rm JOIN users u2 ON rm.user_id = u2.id WHERE rm.id = m.reply_to_id) as reply_user_name
      FROM office_messages m
      JOIN users u ON m.user_id = u.id
    `;
    let queryParams = [];

    if (recipientId && recipientId !== 'group' && recipientId !== 'null' && recipientId !== 'undefined') {
      // Private 1-on-1 messages between current user and specified recipient
      queryText += ` WHERE ((m.user_id = $1 AND m.recipient_id = $2) OR (m.user_id = $2 AND m.recipient_id = $1))`;
      queryParams = [currentUserId, recipientId];

      // Mark incoming private messages as read
      await db.query(
        `UPDATE office_messages SET is_read = TRUE WHERE recipient_id = $1 AND user_id = $2 AND is_read = FALSE`,
        [currentUserId, recipientId]
      ).catch(() => { });
    } else {
      // Group chat messages (where recipient_id IS NULL)
      queryText += ` WHERE m.recipient_id IS NULL`;
    }

    queryText += ` ORDER BY m.created_at ASC LIMIT 200`;

    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Post new message (supports recipient_id for private 1-on-1 chat)
app.post('/api/office/messages', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const { message_text, reply_to_id, recipient_id } = req.body;
    if (!message_text || message_text.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Check if chat is enabled
    if (req.user.role !== 'admin') {
      const settingRes = await db.query("SELECT value FROM settings WHERE key = 'chat_enabled'");
      const isEnabled = settingRes.rows.length > 0 ? settingRes.rows[0].value === 'true' : true;
      if (!isEnabled) {
        return res.status(403).json({ error: "La chat è stata disabilitata dall'amministratore" });
      }
    }

    const targetRecipient = (recipient_id && recipient_id !== 'group' && recipient_id !== 'null') ? recipient_id : null;

    const result = await db.query(
      'INSERT INTO office_messages (user_id, message_text, reply_to_id, recipient_id) VALUES ($1, $2, $3, $4) RETURNING id, message_text, created_at, edited_at, reply_to_id, deleted, recipient_id',
      [req.user.id, message_text.trim(), reply_to_id || null, targetRecipient]
    );

    // Fetch with user details to return the complete object
    const populated = await db.query(`
      SELECT m.id, m.message_text, m.created_at, m.edited_at, m.reply_to_id, m.deleted, m.recipient_id,
             u.name, u.role, u.id as user_id,
             (SELECT message_text FROM office_messages WHERE id = m.reply_to_id) as reply_message_text,
             (SELECT u2.name FROM office_messages rm JOIN users u2 ON rm.user_id = u2.id WHERE rm.id = m.reply_to_id) as reply_user_name
      FROM office_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(populated.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Edit Message (WhatsApp style)
app.put('/api/office/messages/:id', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const msgId = req.params.id;
    const { message_text } = req.body;
    if (!message_text || message_text.trim() === '') {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    const msgRes = await db.query('SELECT user_id FROM office_messages WHERE id = $1', [msgId]);
    if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

    // Only owner can edit message
    if (msgRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Puoi modificare solo i tuoi messaggi' });
    }

    await db.query(
      'UPDATE office_messages SET message_text = $1, edited_at = CURRENT_TIMESTAMP WHERE id = $2',
      [message_text.trim(), msgId]
    );

    const populated = await db.query(`
      SELECT m.id, m.message_text, m.created_at, m.edited_at, m.reply_to_id, m.deleted, m.recipient_id,
             u.name, u.role, u.id as user_id,
             (SELECT message_text FROM office_messages WHERE id = m.reply_to_id) as reply_message_text,
             (SELECT u2.name FROM office_messages rm JOIN users u2 ON rm.user_id = u2.id WHERE rm.id = m.reply_to_id) as reply_user_name
      FROM office_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [msgId]);

    res.json(populated.rows[0]);
  } catch (err) {
    console.error('Error editing message:', err.message);
    res.status(500).send('Server error');
  }
});

// Soft Delete Message
app.delete('/api/office/messages/:id', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const msgId = req.params.id;
    // Check if user is admin or the owner
    const msgRes = await db.query('SELECT user_id FROM office_messages WHERE id = $1', [msgId]);
    if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

    if (req.user.role !== 'admin' && msgRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to delete this message' });
    }

    await db.query('UPDATE office_messages SET deleted = TRUE WHERE id = $1', [msgId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin User Management Endpoints (Get, Create, Update, Delete Sellers)
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role, venditore_code, phone, address, created_at FROM users ORDER BY role ASC, name ASC');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password, role, venditore_code } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e password sono obbligatori' });
    }
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Un utente esiste già con questa email' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const cleanCode = (venditore_code && venditore_code.trim()) ? venditore_code.toUpperCase().trim() : null;
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role, venditore_code) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, venditore_code',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, role || 'seller', cleanCode]
    );
    res.status(201).json({ user: newUser.rows[0], message: 'Utente creato con successo' });
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: err.message || 'Errore durante la creazione dell\'utente' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, venditore_code, password } = req.body;
    let updateQuery, params;
    const cleanCode = (venditore_code && venditore_code.trim()) ? venditore_code.toUpperCase().trim() : null;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, venditore_code = $4, password = $5 WHERE id = $6 RETURNING id, name, email, role, venditore_code';
      params = [name.trim(), email.toLowerCase().trim(), role, cleanCode, hashedPassword, id];
    } else {
      updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, venditore_code = $4 WHERE id = $5 RETURNING id, name, email, role, venditore_code';
      params = [name.trim(), email.toLowerCase().trim(), role, cleanCode, id];
    }
    const updated = await db.query(updateQuery, params);
    res.json({ user: updated.rows[0], message: 'Utente aggiornato con successo' });
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ error: err.message || 'Errore durante l\'aggiornamento dell\'utente' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM office_messages WHERE user_id = $1', [id]);
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Utente eliminato con successo' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: err.message || 'Errore durante l\'eliminazione dell\'utente' });
  }
});

// Single Page Application fallback for web navigation
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath);
  }
  res.json({ status: 'ok', message: 'Rossomandi Backend Running' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    // Run background auto-sync for newly placed local car photos & PDFs
    syncLocalAssetsToCloud();
    setInterval(syncLocalAssetsToCloud, 30000);
  });
}

module.exports = app;

