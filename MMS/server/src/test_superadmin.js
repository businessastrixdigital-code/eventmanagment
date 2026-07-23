import http from 'http';

async function testSuperAdmin() {
  console.log('--- Super Admin API Verification Script (using native http) ---');

  // Helper for requests
  const request = (url, options = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(reqOptions, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsedData });
          } catch (e) {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, raw: rawData });
          }
        });
      });

      req.on('error', (e) => reject(e));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  // 1. Authenticate / Login as Super Admin (Admin specific endpoint)
  let token = '';
  try {
    const res = await request('http://localhost:3001/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@wedding.com',
      password: 'admin12345'
    });

    if (!res.ok) {
      console.error('❌ Login failed:', res.data);
      process.exit(1);
    }

    token = res.data.token;
    console.log('✅ Login successful! Token acquired.');
  } catch (err) {
    console.error('❌ Login failed with network error:', err.message);
    process.exit(1);
  }

  // 2. Fetch Super Admin Dashboard metrics
  try {
    const res = await request('http://localhost:3001/api/superadmin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error('❌ Fetch Dashboard metrics failed:', res.data || res.raw);
    } else {
      console.log('✅ Dashboard metrics loaded successfully:', res.data);
    }
  } catch (err) {
    console.error('❌ Dashboard metrics failed with network error:', err.message);
  }

  // 3. Fetch Couple list
  try {
    const res = await request('http://localhost:3001/api/superadmin/couples', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error('❌ Fetch couples list failed:', res.data || res.raw);
    } else {
      console.log(`✅ Couples list loaded successfully. Total: ${res.data.total} couples found.`);
    }
  } catch (err) {
    console.error('❌ Fetch couples failed with network error:', err.message);
  }
}

testSuperAdmin();
