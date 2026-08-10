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



// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellato BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tipo VARCHAR(100);`);

    // Purge old legacy format rows without underscore
    await db.query("DELETE FROM appointments WHERE POSITION('_' IN intorno) = 0;").catch(() => { });

    // Promote administration users to admin role dynamically
    await db.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email IN ('Lorenzo@gmail.com', 'lorenzo01@gmail.com', 'junaid4@gmail.com') 
         OR email LIKE '%francesco%' 
         OR email LIKE '%valentina%'
         OR name ILIKE '%lorenzo%' 
         OR name ILIKE '%junaid%' 
         OR name ILIKE '%francesco%'
         OR name ILIKE '%valentina%';
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

    // Alter office_messages to add missing columns safely
    await db.query(`
      ALTER TABLE office_messages 
      ADD COLUMN IF NOT EXISTS reply_to_id INT REFERENCES office_messages(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
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

    // Seed seller account (Massimo)
    const massimoEmail = 'massimo@rossomandi.com';
    const massimoExists = await db.query('SELECT * FROM users WHERE email = $1', [massimoEmail]);
    if (massimoExists.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('seller123', salt);
      await db.query(
        "INSERT INTO users (name, email, password, role, venditore_code) VALUES ($1, $2, $3, $4, $5)",
        ['Massimo', massimoEmail, hashedPassword, 'seller', 'MR']
      );
      console.log('Seeded Massimo account (massimo@rossomandi.com / seller123)');
    } else {
      await db.query(
        "UPDATE users SET role = 'seller', venditore_code = 'MR' WHERE email = $1",
        [massimoEmail]
      );
    }

    // Admin and Massimo account seeding complete

    // Promote all Junaid and official admin accounts to admin role
    await db.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email IN ('junaidmunir.janjua1@rossomandi.com', 'junaidmunir.janjua@rossomandi.com', 'admin@rossomandi.com', 'lorenzo@gmail.com', 'junaid4@gmail.com')
         OR email LIKE '%admin%' 
         OR email LIKE '%junaid%';
    `);

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

  // 1. Admin Role Priority
  if (
    requestedRole === 'admin' ||
    emailLower.includes('admin') ||
    emailLower.includes('lorenzo') ||
    emailLower.includes('junaid') ||
    emailLower.includes('janjua') ||
    emailLower.includes('francesco') ||
    emailLower.includes('valentina') ||
    nameLower.includes('admin') ||
    nameLower.includes('lorenzo') ||
    nameLower.includes('junaid') ||
    nameLower.includes('janjua') ||
    nameLower.includes('francesco') ||
    nameLower.includes('valentina')
  ) {
    return { role: 'admin', venditore_code: null };
  }

  // 2. Seller Role Priority
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
      } else {
        const emailUsername = emailLower.split('@')[0];
        if (emailUsername.includes('.')) {
          const parts = emailUsername.split('.');
          if (parts[0] && parts[1] && parts[0].length > 0 && parts[1].length > 0) {
            code = (parts[0][0] + parts[1][0]).toUpperCase();
          }
        }
      }
    }
    return { role: 'seller', venditore_code: code };
  }

  return { role: 'client', venditore_code: null };
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
      const isOfficialAdminEmail = validAdminEmails.includes(emailLower) || emailLower.includes('junaid') || emailLower.includes('janjua') || emailLower.includes('lorenzo') || emailLower.includes('admin') || emailLower.endsWith('@rossomandi.com');
      const isPasscodeValid = (admin_code || '').trim() === 'ADMIN2026' || (admin_code || '').trim() === '1234';

      if (!isOfficialAdminEmail && !isPasscodeValid) {
        return res.status(403).json({ error: 'Codice di sicurezza Amministratore non valido o email non autorizzata.' });
      }
    }

    // Auto-recognize role and seller code from email / name / input
    const { role: userRole, venditore_code: sellerCode } = determineUserRoleAndCode(email, name, role, venditore_code);

    if (userRole === 'seller' && !sellerCode) {
      return res.status(400).json({ error: 'Codice venditore non specificato. Seleziona il tuo codice venditore.' });
    }

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
      process.env.JWT_SECRET,
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
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token with role
    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
      process.env.JWT_SECRET,
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

    const nameLower = name ? name.toLowerCase() : '';
    const emailLower = email ? email.toLowerCase() : '';
    const isAdminUser = role === 'admin' ||
      nameLower.includes('lorenzo') ||
      nameLower.includes('junaid') ||
      nameLower.includes('francesco') ||
      nameLower.includes('valentina') ||
      emailLower.includes('lorenzo') ||
      emailLower.includes('junaid') ||
      emailLower.includes('francesco') ||
      emailLower.includes('valentina') ||
      emailLower.includes('test');

    // Fetch appointments gracefully (default to active appointments from yesterday onwards)
    const filterVenditore = req.query.venditore;
    const includeHistory = req.query.all_history === 'true';

    let queryText = 'SELECT intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo FROM appointments';
    let queryParams = [];

    if (filterVenditore && filterVenditore !== '__ALL__') {
      queryText += ' WHERE venditore ILIKE $1';
      queryParams.push(filterVenditore);
    } else if (!isAdminUser && venditore_code) {
      // Check if seller code has appointments in DB
      const checkCount = await db.query('SELECT COUNT(*) FROM appointments WHERE venditore ILIKE $1', [venditore_code]);
      if (parseInt(checkCount.rows[0].count, 10) > 0) {
        queryText += ' WHERE venditore ILIKE $1';
        queryParams.push(venditore_code);
      }
    }

    if (!includeHistory) {
      if (queryParams.length > 0) {
        queryText += " AND (data_ora >= (CURRENT_DATE - INTERVAL '1 day') OR data_ora IS NULL)";
      } else {
        queryText += " WHERE (data_ora >= (CURRENT_DATE - INTERVAL '1 day') OR data_ora IS NULL)";
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

// Sync endpoint allowing local sync.py script to push MS Access appointments directly to Render DB
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

    const query = `
      INSERT INTO appointments (intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo, last_sync)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
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

    for (const appt of appointments) {
      await db.query(query, [
        appt.intorno,
        appt.cliente,
        appt.venditore,
        appt.data_ora || null,
        appt.luogo || null,
        appt.note || null,
        appt.cancellato || false,
        appt.tipo || null
      ]);
    }

    console.log(`Synced ${appointments.length} appointments from sync script!`);
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

// OFFICE CHAT ENDPOINTS

// Get recent messages
app.get('/api/office/messages', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.id, m.message_text, m.created_at, m.reply_to_id, m.deleted, u.name, u.role,
             (SELECT message_text FROM office_messages WHERE id = m.reply_to_id) as reply_message_text,
             (SELECT u2.name FROM office_messages rm JOIN users u2 ON rm.user_id = u2.id WHERE rm.id = m.reply_to_id) as reply_user_name
      FROM office_messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at ASC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Post new message
app.post('/api/office/messages', authenticateToken, isOfficeStaff, async (req, res) => {
  try {
    const { message_text, reply_to_id } = req.body;
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

    const result = await db.query(
      'INSERT INTO office_messages (user_id, message_text, reply_to_id) VALUES ($1, $2, $3) RETURNING id, message_text, created_at, reply_to_id, deleted',
      [req.user.id, message_text.trim(), reply_to_id || null]
    );

    // Fetch with user details to return the complete object
    const populated = await db.query(`
      SELECT m.id, m.message_text, m.created_at, m.reply_to_id, m.deleted, u.name, u.role,
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
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Utente eliminato con successo' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'utente' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

