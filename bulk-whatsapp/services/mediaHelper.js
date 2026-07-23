const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Downloads media from URL (Cloudinary or direct HTTP/HTTPS) temporarily and creates MessageMedia.
 * Automatically cleans up the temporary file after conversion.
 * 
 * @param {string} url - Direct media URL or Cloudinary URL
 * @param {string} [customMimeType] - Optional override mime type
 * @returns {Promise<{ media: MessageMedia, tempFilePath: string }>}
 */
const downloadAndCreateMedia = async (url, customMimeType = null) => {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid media URL provided.');
    }

    // Try native fetch
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download media from URL: ${url} (HTTP ${response.status})`);
    }

    const contentType = customMimeType || response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine filename and extension
    let extension = '.bin';
    if (contentType.includes('pdf')) extension = '.pdf';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
    else if (contentType.includes('png')) extension = '.png';
    else if (contentType.includes('webp')) extension = '.webp';
    else if (contentType.includes('mp4')) extension = '.mp4';
    else {
        const urlPath = new URL(url).pathname;
        const ext = path.extname(urlPath);
        if (ext) extension = ext;
    }

    const filename = `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extension}`;
    const tempFilePath = path.join(tempDir, filename);

    // Save temporary file to disk
    fs.writeFileSync(tempFilePath, buffer);

    try {
        // Create MessageMedia from file path or base64 buffer
        const base64Data = buffer.toString('base64');
        const media = new MessageMedia(contentType, base64Data, filename);

        return { media, tempFilePath };
    } catch (err) {
        // Clean up on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw err;
    }
};

/**
 * Removes temporary file from disk.
 * @param {string} filePath 
 */
const cleanupTempFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error(`Failed to delete temp file ${filePath}:`, err.message);
        }
    }
};

module.exports = {
    downloadAndCreateMedia,
    cleanupTempFile
};
