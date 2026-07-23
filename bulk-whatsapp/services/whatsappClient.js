const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bulk-whatsapp-session',
        dataPath: path.join(__dirname, '../sessions')
    }),
    puppeteer: {
        handleSIGINT: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--no-first-run',
            '--no-zygote',
            '--deterministic-fetch'
        ]
    }
});

module.exports = client;
