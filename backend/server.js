const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root health check endpoint
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Rossomandi Backend Running' }));



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

// Serve uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));

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

    // Seed admin accounts only
    const officialSellers = [
      { name: 'Lorenzo', email: 'lorenzo@rossomandi.com', code: 'LR', role: 'admin' },
      { name: 'System Admin', email: 'admin@rossomandi.com', code: 'ADM', role: 'admin' },
    ];

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultSellerHash = await bcrypt.hash('seller123', defaultSalt);
    const defaultAdminHash = await bcrypt.hash('admin123', defaultSalt);

    for (const u of officialSellers) {
      try {
        const uExists = await db.query('SELECT * FROM users WHERE email = $1', [u.email.toLowerCase().trim()]);
        const passHash = u.role === 'admin' ? defaultAdminHash : defaultSellerHash;
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
    req.user = { id: 0, role: 'admin', email: 'guest@rossomandi.com' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = { id: 0, role: 'admin', email: 'guest@rossomandi.com' };
    next();
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

// Office Staff Auth Check Middleware (Admin or Seller)
const isOfficeStaff = async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length > 0 && (userResult.rows[0].role === 'admin' || userResult.rows[0].role === 'seller')) {
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

  return { role: 'seller', venditore_code: null };
}

// Public and authenticated endpoint to get distinct seller codes for dropdowns
const handleSellersList = async (req, res) => {
  try {
    const sellersResult = await db.query(
      "SELECT DISTINCT UPPER(TRIM(venditore)) as code FROM appointments WHERE venditore IS NOT NULL AND TRIM(venditore) != '' ORDER BY code ASC"
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
    const { name, email, password, role, venditore_code, admin_code, phone, address } = req.body;

    // Check if user exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 1. Admin Security Check
    if (role === 'admin') {
      const emailLower = (email || '').toLowerCase().trim();
      const validAdminEmails = ['admin@rossomandi.com', 'lorenzo@rossomandi.com', 'francesco@rossomandi.com', 'valentina@rossomandi.com', 'junaid@rossomandi.com', 'junaidmunir.janjua@rossomandi.com', 'junaidmunir@rossomandi.com'];
      const isOfficialAdminEmail = validAdminEmails.includes(emailLower) || emailLower.endsWith('@rossomandi.com');
      const isPasscodeValid = (admin_code || '').trim() === 'ADMIN2026' || (admin_code || '').trim() === '1234';

      if (!isOfficialAdminEmail && !isPasscodeValid) {
        return res.status(403).json({ error: 'Codice di sicurezza Amministratore non valido o email non autorizzata.' });
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

    // Generate token with role
    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
        role: user.rows[0].role,
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
      // Admin: Current month (1st of month) to future
      // Seller: Yesterday to future
      const dateFilter = isAdminUser
        ? "data_ora >= DATE_TRUNC('month', CURRENT_DATE)"
        : "data_ora >= (CURRENT_DATE - INTERVAL '1 day')";

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


// GET distinct seller codes from appointments (for dropdown filter)
app.get('/api/seller/sellers-list', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT UPPER(venditore) AS venditore FROM appointments WHERE venditore IS NOT NULL AND TRIM(venditore) != \'\' ORDER BY venditore ASC');
    res.json({ sellers: result.rows.map(r => r.venditore) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


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
       WHERE role IN ('admin', 'seller') AND id != $1 
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

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

