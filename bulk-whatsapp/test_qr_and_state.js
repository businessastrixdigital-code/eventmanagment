const http = require('http');

const apiKey = process.env.API_KEY || 'kameshwar-secret-123';

const request = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTest() {
    console.log('1. Calling POST /session/create for fresh_session_test...');
    const createRes = await request('/session/create', 'POST', { sessionId: 'fresh_session_test' });
    console.log('CREATE RESPONSE:', JSON.stringify(createRes.data, null, 2));

    console.log('\nWaiting 12 seconds for WhatsApp Web Puppeteer QR generation...');
    await new Promise(r => setTimeout(r, 12000));

    console.log('\n2. Calling GET /session/fresh_session_test/qr ...');
    const qrRes = await request('/session/fresh_session_test/qr');
    console.log('====================================================');
    console.log('  EXACT JSON RESPONSE FROM GET /session/fresh_session_test/qr:');
    console.log('====================================================');
    console.log(JSON.stringify(qrRes.data, null, 2));
    console.log('====================================================');
}

runTest();
