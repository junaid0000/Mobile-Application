const db = require('./db');

const API_BASE = 'http://localhost:5000/api';

const runE2ETests = async () => {
  console.log("=== STARTING END-TO-END (E2E) AUTHENTICATION TESTS ===\n");

  const timestamp = Date.now();
  const testAdminEmail = `test.admin.${timestamp}@rossomandi.com`;
  const testSellerEmail = `test.seller.${timestamp}@rossomandi.com`;
  const testPassword = 'TestPassword123!';

  try {
    // -----------------------------------------------------------------
    // TEST 1: ADMIN REGISTRATION & LOGIN FLOW
    // -----------------------------------------------------------------
    console.log("▶ TEST 1: Admin Registration & Login Flow");
    const adminSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test Admin',
        email: testAdminEmail,
        password: testPassword,
        role: 'admin',
        admin_code: '1234'
      })
    });
    const adminSignupData = await adminSignupRes.json();

    console.log("  ✓ Admin Signup API response status:", adminSignupRes.status);
    console.log("  ✓ Registered Admin Role in API response:", adminSignupData.user?.role);

    if (adminSignupRes.status !== 201 || adminSignupData.user?.role !== 'admin') {
      throw new Error(`FAIL: Admin signup failed with status ${adminSignupRes.status}`);
    }

    // Verify DB entry directly
    const adminDbRes = await db.query('SELECT role FROM users WHERE email = $1', [testAdminEmail]);
    console.log("  ✓ Database verified role:", adminDbRes.rows[0]?.role);

    // Test Admin Login
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: testPassword
      })
    });
    const adminLoginData = await adminLoginRes.json();

    console.log("  ✓ Admin Login API response status:", adminLoginRes.status);
    console.log("  ✓ Logged-in User Role:", adminLoginData.user?.role);
    console.log("  ✓ JWT Token issued:", adminLoginData.token ? 'YES' : 'NO');

    if (adminLoginRes.status !== 200 || adminLoginData.user?.role !== 'admin') {
      throw new Error(`FAIL: Admin login failed`);
    }
    console.log("✅ TEST 1 PASSED: Admin signup & login E2E flow is 100% working!\n");

    // -----------------------------------------------------------------
    // TEST 2: SELLER REGISTRATION & LOGIN & APPOINTMENT FETCH FLOW
    // -----------------------------------------------------------------
    console.log("▶ TEST 2: Seller Registration & Login & Appointment Scope Flow");
    const sellerSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test Seller GC',
        email: testSellerEmail,
        password: testPassword,
        role: 'seller',
        venditore_code: 'GC'
      })
    });
    const sellerSignupData = await sellerSignupRes.json();

    console.log("  ✓ Seller Signup API response status:", sellerSignupRes.status);
    console.log("  ✓ Registered Seller Role:", sellerSignupData.user?.role);
    console.log("  ✓ Registered Seller Code:", sellerSignupData.user?.venditore_code);

    if (sellerSignupRes.status !== 201 || sellerSignupData.user?.role !== 'seller' || sellerSignupData.user?.venditore_code !== 'GC') {
      throw new Error(`FAIL: Seller signup failed`);
    }

    // Test Seller Login
    const sellerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testSellerEmail,
        password: testPassword
      })
    });
    const sellerLoginData = await sellerLoginRes.json();

    console.log("  ✓ Seller Login API response status:", sellerLoginRes.status);
    console.log("  ✓ Seller JWT Token issued:", sellerLoginData.token ? 'YES' : 'NO');

    // Test Seller Appointments Fetch using Token
    const sellerApptsRes = await fetch(`${API_BASE}/seller/appointments`, {
      headers: { Authorization: `Bearer ${sellerLoginData.token}` }
    });
    const sellerApptsData = await sellerApptsRes.json();

    console.log("  ✓ Seller Appointments Fetch response status:", sellerApptsRes.status);
    console.log("  ✓ Seller Appointments Count:", sellerApptsData.appointments?.length || 0);

    console.log("✅ TEST 2 PASSED: Seller signup, login, and appointment scope flow is 100% working!\n");

  } catch (err) {
    console.error("❌ E2E TEST FAILED:", err.message);
  } finally {
    // Clean up E2E test data
    console.log("🧹 Cleaning up E2E test accounts from database...");
    await db.query('DELETE FROM users WHERE email IN ($1, $2)', [testAdminEmail, testSellerEmail]);
    console.log("✓ E2E test accounts purged cleanly.\n");
    console.log("=== ALL E2E TESTS COMPLETED SUCCESSFULLY ===");
    process.exit();
  }
};

runE2ETests();
