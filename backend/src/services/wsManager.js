const WebSocket = require('ws');

let wss = null;
const clients = new Map(); 

function init(websocketServer) {
  wss = websocketServer;

  wss.on('connection', (ws, req) => {
    const clientId = Date.now() + '_' + Math.random().toString(36).slice(2);
    clients.set(clientId, ws);
    console.log(`🔌 Dashboard connected: ${clientId} (total: ${clients.size})`);

    send(ws, { type: 'connected', clientId, time: new Date().toISOString() });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        handleClientMessage(ws, data);
      } catch (e) {
        console.error('WS parse error:', e.message);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`🔌 Dashboard disconnected: ${clientId} (total: ${clients.size})`);
    });

    ws.on('error', (err) => {
      console.error(`WS error [${clientId}]:`, err.message);
      clients.delete(clientId);
    });
  });
}

function handleClientMessage(ws, data) {
  if (data.type === 'subscribe' && data.deviceId) {
    ws._subscribedDevice = data.deviceId;
    send(ws, { type: 'subscribed', deviceId: data.deviceId });
  }
}

function broadcastAll(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

function broadcastToDevice(deviceId, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ ...payload, deviceId });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!ws._subscribedDevice || ws._subscribedDevice === deviceId) {
        ws.send(msg);
      }
    }
  });
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getClientCount() {
  return clients.size;
}

module.exports = { init, broadcastAll, broadcastToDevice, getClientCount };