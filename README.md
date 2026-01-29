# ESP32 Cloud Relay Server

Cloud relay server for ESP32-CAM remote streaming.

## Features
- Device registration and management
- MJPEG stream proxying
- Automatic device cleanup
- Health monitoring

## API Endpoints

### Health Check
GET /

### Device Management
- POST /api/devices/register - Register new device
- POST /api/devices/heartbeat - Send device heartbeat
- GET /api/devices/:device_id - Get device info
- GET /api/devices - List all devices

### Streaming
- GET /stream/:device_id - MJPEG stream
- GET /capture/:device_id - Single frame capture

## Environment Variables
- PORT: Server port (default: 3000)

## Deployment
Deploy on Render.com with Node.js environment.
