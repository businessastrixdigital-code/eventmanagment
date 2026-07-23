const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

const sampleWaQr = '2@uK8d0sW3kL9mN2pQ4rS6tU8vW0xY2zA4bC6dE8fG0hI2jK4lM6nP8qR0sT2uV4wX6yZ,A1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3z=,1';

console.log('Sample WA QR String length:', sampleWaQr.length);

async function testQr() {
  const dataUrlL = await QRCode.toDataURL(sampleWaQr, { errorCorrectionLevel: 'L', margin: 4 });
  const dataUrlM = await QRCode.toDataURL(sampleWaQr, { errorCorrectionLevel: 'M', margin: 4 });
  const dataUrlH = await QRCode.toDataURL(sampleWaQr, { errorCorrectionLevel: 'H', margin: 4 });

  console.log('Data URL L prefix:', dataUrlL.substring(0, 50), 'length:', dataUrlL.length);
  console.log('Data URL M prefix:', dataUrlM.substring(0, 50), 'length:', dataUrlM.length);
  console.log('Data URL H prefix:', dataUrlH.substring(0, 50), 'length:', dataUrlH.length);

  qrcodeTerminal.generate(sampleWaQr, { small: true });
}

testQr();
