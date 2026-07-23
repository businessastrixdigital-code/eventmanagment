import dotenv from 'dotenv';

dotenv.config();

const getServiceUrl = () => (process.env.WHATSAPP_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://bulk-whatsapp-service.onrender.com' : 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const getApiKey = () => process.env.WHATSAPP_SERVICE_API_KEY || '';

const makeRequest = async (endpoint, method = 'GET', body = null) => {
  const url = `${getServiceUrl()}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': getApiKey()
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: `Bulk WhatsApp Service connection error: ${err.message}`
    };
  }
};

/**
 * Get connection status for a session ID (e.g. {functionId}_HOST_A)
 */
export const getSessionStatus = async (sessionId) => {
  const result = await makeRequest(`/api/sessions/${sessionId}/status`);
  if (!result.ok) {
    return {
      status: 'Disconnected',
      error: result.error || 'Failed to fetch session status'
    };
  }
  return result.data;
};

/**
 * Trigger start/connect for a WhatsApp session
 */
export const connectSession = async (sessionId) => {
  return await makeRequest(`/api/sessions/${sessionId}/start`, 'POST');
};

/**
 * Trigger stop/disconnect for a WhatsApp session
 */
export const disconnectSession = async (sessionId) => {
  return await makeRequest(`/api/sessions/${sessionId}/stop`, 'POST');
};

/**
 * Get QR code for a session when in QR_Ready status
 */
export const getQRCode = async (sessionId) => {
  const result = await makeRequest(`/api/sessions/${sessionId}/qr`);
  if (result.ok && result.data && result.data.qr) {
    return result.data.qr;
  }
  return null;
};

/**
 * Send text message through Bulk WhatsApp Service HTTP API
 */
export const sendTextMessage = async (sessionId, recipientPhone, messageText) => {
  const cleanMobile = (recipientPhone || '').replace(/[^0-9]/g, '');
  return await makeRequest('/api/messages/send-text', 'POST', {
    sessionId,
    phone: cleanMobile,
    message: messageText
  });
};

/**
 * Send media (e.g., PDF invitation card) through Bulk WhatsApp Service HTTP API
 */
export const sendMediaMessage = async (sessionId, recipientPhone, captionText, mediaUrl) => {
  const cleanMobile = (recipientPhone || '').replace(/[^0-9]/g, '');
  return await makeRequest('/api/messages/send-media', 'POST', {
    sessionId,
    phone: cleanMobile,
    caption: captionText,
    mediaUrl
  });
};

export default {
  getSessionStatus,
  connectSession,
  disconnectSession,
  getQRCode,
  sendTextMessage,
  sendMediaMessage
};
