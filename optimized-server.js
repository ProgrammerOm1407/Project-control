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
const AUTH_PASSWORD = '123'; // Simple password for demo

// Serve static files if they exist
app.use(express.static(path.join(__dirname, 'public')));

// Serve the client HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Throttle variables for high-frequency events
  const throttleTime = 10; // ms - reduced for minimal latency
  const mouseSensitivity = 1.5; // Increase mouse movement sensitivity
  let lastMouseMoveTime = 0;
  let lastScrollTime = 0;
  let pendingMouseMove = null;
  let pendingScroll = null;
  let authenticated = false;

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      
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
          // Throttle mouse movements for better performance
          const now = Date.now();
          
          // Update pending move with latest values and apply sensitivity
          if (!pendingMouseMove) {
            pendingMouseMove = { dx: 0, dy: 0 };
          }
          pendingMouseMove.dx += (data.dx || 0) * mouseSensitivity;
          pendingMouseMove.dy += (data.dy || 0) * mouseSensitivity;
          
          // Only process if enough time has passed since last move
          if (now - lastMouseMoveTime >= throttleTime) {
            processMouseMove();
            lastMouseMoveTime = now;
          }
          
        } else if (data.type === 'mouseClick') {
          // Click mouse button: left or right
          const button = data.button || 'left';
          robot.mouseClick(button);
          
        } else if (data.type === 'keyTap') {
          // Press a key
          robot.keyTap(data.key);
          
        } else if (data.type === 'scroll') {
          // Throttle scroll events
          const now = Date.now();
          
          // Update pending scroll with latest values
          if (!pendingScroll) {
            pendingScroll = { dy: 0 };
          }
          pendingScroll.dy += data.dy || 0;
          
          // Only process if enough time has passed since last scroll
          if (now - lastScrollTime >= throttleTime) {
            processScroll();
            lastScrollTime = now;
          }
          
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
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown command type: ${data.type}`
          }));
        }
      } catch (commandErr) {
        console.error('Error executing command:', commandErr);
        ws.send(JSON.stringify({
          type: 'error',
          message: commandErr.message
        }));
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  
  // Function to process mouse movement
  function processMouseMove() {
    if (!pendingMouseMove) return;
    
    const dx = pendingMouseMove.dx;
    const dy = pendingMouseMove.dy;
    pendingMouseMove = null;
    
    if (dx === 0 && dy === 0) return;
    
    // Get current mouse position
    const pos = robot.getMousePos();
    
    // Calculate new position
    let newX = pos.x + dx;
    let newY = pos.y + dy;
    
    // Clamp to screen size
    const screenSize = robot.getScreenSize();
    newX = Math.max(0, Math.min(screenSize.width - 1, newX));
    newY = Math.max(0, Math.min(screenSize.height - 1, newY));
    
    robot.moveMouse(newX, newY);
  }
  
  // Function to process scroll
  function processScroll() {
    if (!pendingScroll) return;
    
    const dy = pendingScroll.dy;
    pendingScroll = null;
    
    if (dy === 0) return;
    
    robot.scrollMouse(0, dy);
  }
  
  // Process any pending actions on interval for smoother performance
  const actionInterval = setInterval(() => {
    const now = Date.now();
    
    if (pendingMouseMove && now - lastMouseMoveTime >= throttleTime) {
      processMouseMove();
      lastMouseMoveTime = now;
    }
    
    if (pendingScroll && now - lastScrollTime >= throttleTime) {
      processScroll();
      lastScrollTime = now;
    }
  }, throttleTime/2);
  
  // Clean up on disconnect
  ws.on('close', () => {
    clearInterval(actionInterval);
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Use your mobile browser to connect to this URL for control interface`);
  
  // Display the local IP addresses for easier connection
  const networks = os.networkInterfaces();
  for (const name of Object.keys(networks)) {
    for (const net of networks[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Available on:\nhttp://${net.address}:${PORT}`);
      }
    }
  }
});