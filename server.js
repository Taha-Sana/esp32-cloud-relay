const express = require('express');
const http = require('http');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Store active devices
const devices = new Map();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'ESP32 Cloud Relay',
    devices: devices.size,
    uptime: process.uptime()
  });
});

// Device Registration
app.post('/api/devices/register', async (req, res) => {
  const { device_id, local_ip, status } = req.body;
  
  devices.set(device_id, {
    local_ip: local_ip || 'unknown',
    status: status || 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString()
  });
  
  console.log(`✓ Device registered: ${device_id} (${local_ip})`);
  
  const publicURL = `${req.protocol}://${req.get('host')}/stream/${device_id}`;
  
  res.json({
    success: true,
    device_id,
    stream_url: publicURL,
    message: 'Device registered successfully'
  });
});

// Heartbeat endpoint
app.post('/api/devices/heartbeat', (req, res) => {
  const { device_id, status } = req.body;
  
  if (devices.has(device_id)) {
    const device = devices.get(device_id);
    device.last_seen = Date.now();
    device.status = status || 'online';
    devices.set(device_id, device);
  } else {
    return res.status(404).json({ 
      error: 'Device not found',
      message: 'Please register device first' 
    });
  }
  
  res.json({ 
    success: true,
    message: 'Heartbeat received'
  });
});

// Get device info
app.get('/api/devices/:device_id', (req, res) => {
  const { device_id } = req.params;
  
  if (devices.has(device_id)) {
    const device = devices.get(device_id);
    const isOnline = (Date.now() - device.last_seen) < 120000;
    
    res.json({
      ...device,
      status: isOnline ? device.status : 'offline',
      is_online: isOnline
    });
  } else {
    res.status(404).json({ 
      error: 'Device not found',
      message: 'This device has not been registered yet'
    });
  }
});

// List all devices
app.get('/api/devices', (req, res) => {
  const deviceList = [];
  
  for (const [device_id, device] of devices.entries()) {
    const isOnline = (Date.now() - device.last_seen) < 120000;
    deviceList.push({
      device_id,
      ...device,
      status: isOnline ? device.status : 'offline',
      is_online: isOnline
    });
  }
  
  res.json({
    total: deviceList.length,
    devices: deviceList
  });
});

// Stream proxy endpoint
app.get('/stream/:device_id', async (req, res) => {
  const { device_id } = req.params;
  
  console.log(`Stream request for device: ${device_id}`);
  
  if (!devices.has(device_id)) {
    console.log(`Device not found: ${device_id}`);
    return res.status(404).send('Device not found');
  }
  
  const device = devices.get(device_id);
  const isOnline = (Date.now() - device.last_seen) < 120000;
  
  if (!isOnline) {
    console.log(`Device offline: ${device_id}`);
    return res.status(503).send('Device is offline');
  }
  
  const streamURL = `http://${device.local_ip}/stream`;
  console.log(`Proxying stream from: ${streamURL}`);
  
  try {
    const response = await fetch(streamURL, {
      method: 'GET',
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    
    response.body.pipe(res);
    
    response.body.on('error', (error) => {
      console.error(`Stream error for ${device_id}:`, error);
    });
    
    req.on('close', () => {
      console.log(`Client disconnected from ${device_id}`);
      response.body.destroy();
    });
    
  } catch (error) {
    console.error(`Stream error for ${device_id}:`, error.message);
    res.status(503).send('Stream unavailable');
  }
});

// Capture single frame
app.get('/capture/:device_id', async (req, res) => {
  const { device_id } = req.params;
  
  if (!devices.has(device_id)) {
    return res.status(404).send('Device not found');
  }
  
  const device = devices.get(device_id);
  const isOnline = (Date.now() - device.last_seen) < 120000;
  
  if (!isOnline) {
    return res.status(503).send('Device is offline');
  }
  
  const captureURL = `http://${device.local_ip}/capture`;
  
  try {
    const response = await fetch(captureURL, { timeout: 10000 });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const imageBuffer = await response.buffer();
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(imageBuffer);
    
  } catch (error) {
    console.error(`Capture error for ${device_id}:`, error.message);
    res.status(503).send('Capture failed');
  }
});

// Clean up inactive devices
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [device_id, device] of devices.entries()) {
    if (now - device.last_seen > 600000) {
      devices.delete(device_id);
      cleanedCount++;
      console.log(`Removed inactive device: ${device_id}`);
    } else if (now - device.last_seen > 120000) {
      device.status = 'offline';
      devices.set(device_id, device);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} inactive devices`);
  }
}, 60000);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║   ESP32 Cloud Relay Server         ║');
  console.log('╚════════════════════════════════════╝');
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Ready to accept connections\n`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
