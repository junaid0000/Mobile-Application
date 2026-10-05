const fs = require('fs');
const path = require('path');
const db = require('./db');

const SUPABASE_URL = 'https://ngvcirlrsgqrzhgawubu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndmNpcmxyc2dxcnpoZ2F3dWJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc2MTUxMSwiZXhwIjoyMTA0MzM3NTExfQ.u8yLJCqgLJm7nBzjSC9we1RGFL3v94-S3Iq71xSBMGM';

async function uploadToSupabase(bucket, filename, fileBuffer, contentType) {
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

async function runInPool(items, limit, workerFn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => workerFn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function run() {
  console.log('--- Checking cloud_assets and DB table ---');
  await db.query(`
    CREATE TABLE IF NOT EXISTS cloud_assets (
      code VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      filename VARCHAR(255),
      cloud_url TEXT,
      file_size BIGINT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (code, type)
    );
  `);
  try {
    await db.query(`
      ALTER TABLE portale_preventivi_esterni 
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS pdf_url TEXT,
      ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS has_pdf BOOLEAN DEFAULT false;
    `);
  } catch (e) {}

  const existingAssets = await db.query('SELECT code, type, filename, cloud_url FROM cloud_assets');
  const existingMap = new Map();
  existingAssets.rows.forEach(r => existingMap.set(`${r.type}:${r.code}`, r.cloud_url));

  // 1. Gather all unique car images
  console.log('\n--- Gathering Car Images ---');
  const sharedCarsDir = 'C:\\Users\\Public\\Esterni photo';
  const localCarsDir = path.join(__dirname, 'uploads', 'cars');
  const imageMap = new Map(); // filename -> fullPath

  [sharedCarsDir, localCarsDir].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const lower = f.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
        if (!imageMap.has(lower)) {
          imageMap.set(lower, path.join(dir, f));
        }
      }
    });
  });

  const imageItems = Array.from(imageMap.entries()).map(([cleanLower, fullPath]) => {
    const code = cleanLower.substring(0, cleanLower.lastIndexOf('.')).trim();
    const basename = path.basename(fullPath);
    return { code, filename: basename, fullPath, isPng: cleanLower.endsWith('.png') };
  });

  console.log(`Found ${imageItems.length} unique car images locally.`);

  let imagesUploaded = 0;
  await runInPool(imageItems, 6, async (item) => {
    const key = `image:${item.code}`;
    let cloudUrl = existingMap.get(key);
    if (!cloudUrl) {
      const fileBuffer = fs.readFileSync(item.fullPath);
      const stat = fs.statSync(item.fullPath);
      const contentType = item.isPng ? 'image/png' : 'image/jpeg';
      cloudUrl = await uploadToSupabase('car-images', item.filename, fileBuffer, contentType);
      if (cloudUrl) {
        imagesUploaded++;
        await db.query(`
          INSERT INTO cloud_assets (code, type, filename, cloud_url, file_size, uploaded_at)
          VALUES ($1, 'image', $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (code, type) DO UPDATE SET filename = $2, cloud_url = $3, file_size = $4, uploaded_at = CURRENT_TIMESTAMP
        `, [item.code, item.filename, cloudUrl, stat.size]);
      }
    }
    if (cloudUrl) {
      await db.query(`
        UPDATE portale_preventivi_esterni 
        SET image_url = $1 
        WHERE LOWER(indice) = $2 OR LOWER(indice) = $3
      `, [cloudUrl, item.code, `idx_${item.code}`]);
    }
  });
  console.log(`Car images synced! (${imagesUploaded} newly uploaded)`);

  // 2. Gather all unique PDFs
  console.log('\n--- Gathering Preventivi PDFs ---');
  const sharedPdfDir = 'C:\\Users\\Public\\Preventivi_PDF';
  const localPdfDir = path.join(__dirname, 'uploads', 'preventivi_pdf');
  const pdfMap = new Map();

  [sharedPdfDir, localPdfDir].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const lower = f.toLowerCase();
      if (lower.endsWith('.pdf')) {
        if (!pdfMap.has(lower)) {
          pdfMap.set(lower, path.join(dir, f));
        }
      }
    });
  });

  const pdfItems = Array.from(pdfMap.entries()).map(([cleanLower, fullPath]) => {
    const code = cleanLower.replace('.pdf', '').trim();
    const basename = path.basename(fullPath);
    return { code, filename: basename, fullPath };
  });

  console.log(`Found ${pdfItems.length} unique PDFs locally.`);

  let pdfsUploaded = 0;
  await runInPool(pdfItems, 4, async (item) => {
    const fileBuffer = fs.readFileSync(item.fullPath);
    const stat = fs.statSync(item.fullPath);
    const cloudUrl = await uploadToSupabase('preventivi-pdf', item.filename, fileBuffer, 'application/pdf');
    if (cloudUrl) {
      pdfsUploaded++;
      await db.query(`
        INSERT INTO cloud_assets (code, type, filename, cloud_url, file_size, uploaded_at)
        VALUES ($1, 'pdf', $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (code, type) DO UPDATE SET filename = $2, cloud_url = $3, file_size = $4, uploaded_at = CURRENT_TIMESTAMP
      `, [item.code, item.filename, cloudUrl, stat.size]);

      await db.query(`
        UPDATE portale_preventivi_esterni 
        SET has_pdf = true, pdf_filename = $1, pdf_url = $2
        WHERE LOWER(nota1) = $3 OR LOWER(indice) = $3
      `, [item.filename, cloudUrl, item.code]);
    }
  });
  console.log(`PDFs synced! (${pdfsUploaded} uploaded)`);

  console.log('\n--- Final Verification ---');
  const statsRes = await db.query(`
    SELECT 
      COUNT(*) as total_cars,
      COUNT(image_url) as cars_with_images,
      COUNT(CASE WHEN has_pdf = true THEN 1 END) as cars_with_pdf
    FROM portale_preventivi_esterni
  `);
  console.log('Database Stats:', statsRes.rows[0]);

  const sampleCars = await db.query(`
    SELECT indice, marca, modello, nota1, has_pdf, pdf_filename, LEFT(image_url, 60) as img_prefix
    FROM portale_preventivi_esterni
    WHERE image_url IS NOT NULL OR has_pdf = true
    LIMIT 5
  `);
  console.log('Sample Cars in Portale:', sampleCars.rows);

  process.exit(0);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
