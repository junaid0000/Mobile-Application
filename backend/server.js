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
app.use(express.json());

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
        intorno INTEGER UNIQUE,
        cliente VARCHAR(255),
        venditore VARCHAR(50),
        data_ora TIMESTAMP,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_venditore ON appointments(venditore);`);
    
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
    await db.query(`ALTER TABLE workshop_visits ALTER COLUMN visit_date TYPE TIMESTAMP WITH TIME ZONE;`).catch(() => {});

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
  
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id, email, role
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Admin Auth Check Middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Admins only' });
  }
};

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    
    // Check if user exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone, address',
      [name, email, hashedPassword, 'client', phone || null, address || null]
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

    // Check if user exists
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
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

    // 1. Fetch user's venditore_code and role
    const userResult = await db.query('SELECT venditore_code, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seller account not found' });
    }

    const { venditore_code, role } = userResult.rows[0];

    // Ensure the user actually has a seller role or is an admin
    if (role !== 'seller' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Only sellers can view appointments' });
    }

    if (!venditore_code && role !== 'admin') {
      return res.status(400).json({ error: 'This user account is not linked to a seller code' });
    }

    // 2. Check if a specific venditore filter was requested via query param
    const filterVenditore = req.query.venditore;

    // 3. Fetch appointments (If admin, fetch all by default; sellers see their own by default)
    let queryText = 'SELECT intorno, cliente, venditore, data_ora FROM appointments';
    let queryParams = [];

    if (filterVenditore) {
      // Explicit filter requested — both sellers and admins can use this
      queryText += ' WHERE venditore = $1';
      queryParams.push(filterVenditore);
    } else if (role !== 'admin') {
      // Default for sellers: show only their own
      queryText += ' WHERE venditore = $1';
      queryParams.push(venditore_code);
    }
    
    queryText += ' ORDER BY data_ora ASC';

    const appointmentsResult = await db.query(queryText, queryParams);

    res.json({
      seller_code: venditore_code || 'ADMIN',
      appointments: appointmentsResult.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET distinct seller codes from appointments (for dropdown filter)
app.get('/api/seller/sellers-list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is a seller or admin
    const userResult = await db.query('SELECT venditore_code, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { role } = userResult.rows[0];
    if (role !== 'seller' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query('SELECT DISTINCT venditore FROM appointments WHERE venditore IS NOT NULL ORDER BY venditore ASC');
    res.json({ sellers: result.rows.map(r => r.venditore) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
