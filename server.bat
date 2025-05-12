const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const robot = require('./automation');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3001;

// Serve static files if they exist
app.use(express.static(path.join(__dirname, 'public')));

// Serve the client HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

// Basic authentication password (change as you want)
const AUTH_PASSWORD = '123';

// Store if a client is authenticated
const clients = new Map();

wss.on('connection', function connection(ws) {
  console.log('New client connected');
  let authenticated = false;

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      if (!authenticated) {
        // Expecting auth message
        if (data.type === 'auth' && data.password === AUTH_PASSWORD) {
          authenticated = true;
          clients.set(ws, true);
          ws.send(JSON.stringify({ 
            type: 'auth', 
            success: true, 
            message: 'Authenticated!',
            screenSize: robot.getScreenSize()
          }));
          console.log('Client authenticated');
        } else {
          ws.send(JSON.stringify({ type: 'auth', success: false, message: 'Authentication failed' }));
          console.log('Authentication failed');
        }
        return;
      }

      if (data.type === 'mouseMove') {
        // Move mouse relative to current position with dx, dy
        const pos = robot.getMousePos();
        let newX = pos.x + data.dx;
        let newY = pos.y + data.dy;
        // Clamp to screen size
        const screenSize = robot.getScreenSize();
        newX = Math.max(0, Math.min(screenSize.width - 1, newX));
        newY = Math.max(0, Math.min(screenSize.height - 1, newY));
        robot.moveMouse(newX, newY);
      } else if (data.type === 'mouseClick') {
        // Click mouse button: left or right
        robot.mouseClick(data.button || 'left');
      } else if (data.type === 'keyTap') {
        // Press a key
        robot.keyTap(data.key);
      } else if (data.type === 'scroll') {
        // Scroll mouse wheel by dy
        robot.scrollMouse(0, data.dy);
      } else if (data.type === 'getScreenInfo') {
        // Send screen information
        const screenSize = robot.getScreenSize();
        ws.send(JSON.stringify({
          type: 'screenInfo',
          width: screenSize.width,
          height: screenSize.height
        }));
      } else if (data.type === 'keyCombo') {
        // Press key combination
        if (Array.isArray(data.keys) && data.keys.length > 0) {
          robot.keyTap(data.keys[0], data.keys.slice(1));
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Use your mobile browser to connect to this URL for control interface`);
  
  // Display the local IP addresses for easier connection
  const networks = os.networkInterfaces();
  console.log('\nAvailable on:');
  for (const name of Object.keys(networks)) {
    for (const net of networks[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`http://${net.address}:${PORT}`);
      }
    }
  }
});

