const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const robot = require('./direct-control');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3001;

// Serve static files if they exist
app.use(express.static(path.join(__dirname, 'public')));

// Serve the client HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
      console.log('Received message:', data);
      
      if (!authenticated) {
        // Expecting auth message
        if (data.type === 'auth' && data.password === AUTH_PASSWORD) {
          authenticated = true;
          clients.set(ws, true);
          const screenSize = robot.getScreenSize();
          ws.send(JSON.stringify({ 
            type: 'auth', 
            success: true, 
            message: 'Authenticated!',
            screenSize: screenSize
          }));
          console.log('Client authenticated');
        } else {
          ws.send(JSON.stringify({ type: 'auth', success: false, message: 'Authentication failed' }));
          console.log('Authentication failed');
        }
        return;
      }

      // Process commands from authenticated clients
      try {
        if (data.type === 'mouseMove') {
          // Move mouse relative to current position with dx, dy
          const pos = robot.getMousePos();
          console.log('Current mouse position:', pos);
          
          let newX = pos.x + data.dx;
          let newY = pos.y + data.dy;
          
          // Clamp to screen size
          const screenSize = robot.getScreenSize();
          newX = Math.max(0, Math.min(screenSize.width - 1, newX));
          newY = Math.max(0, Math.min(screenSize.height - 1, newY));
          
          console.log(`Moving mouse to: ${newX}, ${newY}`);
          const result = robot.moveMouse(newX, newY);
          console.log('Move result:', result);
          
        } else if (data.type === 'mouseClick') {
          // Click mouse button: left or right
          const button = data.button || 'left';
          console.log(`Clicking mouse button: ${button}`);
          const result = robot.mouseClick(button);
          console.log('Click result:', result);
          
        } else if (data.type === 'keyTap') {
          // Press a key
          console.log(`Pressing key: ${data.key}`);
          const result = robot.keyTap(data.key);
          console.log('Key tap result:', result);
          
        } else if (data.type === 'scroll') {
          // Scroll mouse wheel by dy
          console.log(`Scrolling: ${data.dy}`);
          const result = robot.scrollMouse(0, data.dy);
          console.log('Scroll result:', result);
          
        } else if (data.type === 'getScreenInfo') {
          // Send screen information
          const screenSize = robot.getScreenSize();
          console.log('Screen size:', screenSize);
          ws.send(JSON.stringify({
            type: 'screenInfo',
            width: screenSize.width,
            height: screenSize.height
          }));
          
        } else if (data.type === 'keyCombo') {
          // Press key combination
          if (Array.isArray(data.keys) && data.keys.length > 0) {
            console.log(`Pressing key combo: ${data.keys.join('+')}`);
            const result = robot.keyTap(data.keys[0], data.keys.slice(1));
            console.log('Key combo result:', result);
          }
        } else {
          console.log('Unknown command type:', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown command type: ${data.type}`
          }));
        }
      } catch (commandErr) {
        console.error('Error executing command:', commandErr);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Error executing command: ${commandErr.message}`
        }));
      }
    } catch (err) {
      console.error('Error processing message:', err);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      } catch (sendErr) {
        console.error('Error sending error message:', sendErr);
      }
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

