import http from 'http';

async function testCommunicationCenter() {
  console.log('--- Communication Center API & Feature Verification Script ---');

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
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  // 1. Authenticate as Super Admin (Email: admin@wedding.com)
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
    console.log('✅ 1. SuperAdmin Login successful. Token acquired.');
  } catch (err) {
    console.error('❌ Login network error:', err.message);
    process.exit(1);
  }

  // 2. Test Message Templates API
  let templateId = '';
  try {
    const res = await request('http://localhost:3001/api/couple/message-templates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      templateName: 'Test Communication Template',
      messageType: 'Reminder',
      audience: 'all',
      messageContent: 'Hello {{guestName}}, welcome to {{functionName}} for {{eventName}} at {{venue}} on {{eventDate}} at {{eventTime}}. Portal: {{guestPortal}}',
      autoAttachInvitation: true,
      isActive: true
    });

    if (!res.ok) {
      console.error('❌ Template creation failed:', res.data);
    } else {
      templateId = res.data.data.id;
      console.log('✅ 2. Message Template created successfully! ID:', templateId);
    }
  } catch (err) {
    console.error('❌ Template creation error:', err.message);
  }

  // 3. Test Message Reminders API
  try {
    // Fetch events first
    const eventsRes = await request('http://localhost:3001/api/couple/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (eventsRes.ok && eventsRes.data.length > 0 && templateId) {
      const eventId = eventsRes.data[0].id;
      const remRes = await request('http://localhost:3001/api/couple/message-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, {
        eventId,
        templateId,
        timing: '2_hours_before',
        isEnabled: true
      });

      if (remRes.ok) {
        console.log('✅ 3. Message Reminder configuration saved successfully!');
      } else {
        console.error('❌ Reminder creation failed:', remRes.data);
      }
    }
  } catch (err) {
    console.error('❌ Reminder creation error:', err.message);
  }

  // 4. Verify Notifications List
  try {
    const notifRes = await request('http://localhost:3001/api/couple/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (notifRes.ok) {
      console.log(`✅ 4. Notifications queue retrieved. Count: ${notifRes.data.length}`);
    } else {
      console.error('❌ Notifications list failed:', notifRes.data);
    }
  } catch (err) {
    console.error('❌ Notifications error:', err.message);
  }

  console.log('--- All Communication Center Verification Tests Completed ---');
}

testCommunicationCenter();
