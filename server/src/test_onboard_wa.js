import http from 'http';

async function onboardAndGenerateCredentials() {
  console.log('--- Super Admin Onboarding Couple Account & WA Link Generator ---');

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
    console.log('✅ Login successful!');
  } catch (err) {
    console.error('❌ Login failed with network error:', err.message);
    process.exit(1);
  }

  // 2. Onboard Couple Account using target WhatsApp number
  const targetNumber = '9714740275';
  const randMobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  try {
    const res = await request('http://localhost:3001/api/superadmin/couples', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      brideName: 'Riya Patel',
      groomName: 'Arjun Shah',
      mobile: randMobile,
      brideMobile: randMobile,
      brideUsername: `bride_${randMobile}`,
      bridePassword: `${randMobile}@RiyaPatel`,
      groomMobile: randMobile,
      groomUsername: `groom_${randMobile}`,
      groomPassword: `${randMobile}@ArjunShah`,
      commonPassword: `${randMobile}@Common`,
      weddingDate: '2026-12-25',
      hostGroupAName: 'Bride Family',
      hostGroupBName: 'Groom Family'
    });

    if (!res.ok) {
      console.error('❌ Onboarding failed:', res.data || res.raw);
    } else {
      const data = res.data;
      console.log('✅ Account successfully created on backend database!');
      
      const payload = `Hello! Here are your wedding event management workspace login details:\n\n*1. Common Account*\n- Mobile / Username: ${data.couple?.mobile}\n- Temporary Password: ${data.tempPassword}\n\n*2. Bride Account (${data.couple?.brideName})*\n- Username: ${data.couple?.brideUsername}\n- Temporary Password: ${data.bridePassword}\n\n*3. Groom Account (${data.couple?.groomName})*\n- Username: ${data.couple?.groomUsername}\n- Temporary Password: ${data.groomPassword}`;
      const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(payload)}`;
      
      console.log('\n======================================================');
      console.log('🔗 GENERATED PREFILLED WHATSAPP SEND LINK:');
      console.log(waLink);
      console.log('======================================================\n');
    }
  } catch (err) {
    console.error('❌ Request failed with network error:', err.message);
  }
}

onboardAndGenerateCredentials();
