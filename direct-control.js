// direct-control.js - Optimized for low latency
const { execSync, exec } = require('child_process');
const path = require('path');
const { spawn } = require('child_process');

// Path to the PowerShell script (fallback)
const scriptPath = path.join(__dirname, 'mouse-control.ps1');

// Path to the native helper (preferred for better performance)
const helperPath = path.join(__dirname, 'mouse-helper.exe');
const useNativeHelper = false; // Disabled until helper is compiled

// Cache for mouse position to reduce calls
let cachedMousePos = { x: 500, y: 500, timestamp: Date.now() };
const CACHE_LIFETIME = 500; // 500ms cache lifetime

// Queue for commands to prevent overlapping executions
const commandQueue = [];
let isProcessingQueue = false;

// Get screen size
function getScreenSize() {
  // Default screen size
  return { width: 1920, height: 1080 };
}

// Get mouse position with caching
function getMousePos() {
  // Use cached position if it's recent enough
  if (Date.now() - cachedMousePos.timestamp < CACHE_LIFETIME) {
    return cachedMousePos;
  }
  
  try {
    let output;
    
    if (useNativeHelper) {
      // Use the native helper for better performance
      output = execSync(`"${helperPath}" getpos`).toString().trim();
    } else {
      // Fallback to PowerShell script
      output = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}" getpos`).toString().trim();
    }
    
    if (output) {
      const [x, y] = output.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) {
        // Update cache
        cachedMousePos = { x, y, timestamp: Date.now() };
        return cachedMousePos;
      }
    }
  } catch (err) {
    console.error('Error getting mouse position:', err);
  }
  
  // Fallback to cached position
  return cachedMousePos;
}

// Process command queue with batching for better performance
function processQueue() {
  if (isProcessingQueue || commandQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // Process multiple commands at once if they're the same type
  const command = commandQueue.shift();
  const cmdType = command.cmd.split(' ')[3]; // Extract command type (move, click, etc.)
  
  // For mouse moves, batch and only execute the latest one
  if (cmdType === 'move' && commandQueue.length > 0) {
    // Look ahead for more move commands and only keep the latest
    while (commandQueue.length > 0 && commandQueue[0].cmd.split(' ')[3] === 'move') {
      command.cmd = commandQueue.shift().cmd;
    }
  }
  
  // Execute with minimal overhead
  exec(command.cmd, { windowsHide: true }, (error) => {
    if (error && command.fallback) {
      exec(command.fallback, { windowsHide: true });
    }
    
    // Process next command immediately
    isProcessingQueue = false;
    if (commandQueue.length > 0) {
      setImmediate(processQueue); // Use setImmediate for faster processing
    }
  });
}

// Add command to queue
function queueCommand(cmd, fallback = null) {
  // For high-priority commands like clicks, clear the queue first
  if (cmd.includes('click')) {
    commandQueue.length = 0;
  }
  
  commandQueue.push({ cmd, fallback });
  if (!isProcessingQueue) {
    processQueue();
  }
}

// Move mouse to specific coordinates
function moveMouse(x, y) {
  // Update cached position immediately for UI responsiveness
  cachedMousePos = { x, y, timestamp: Date.now() };
  
  // Queue the actual mouse movement command
  if (useNativeHelper) {
    queueCommand(`"${helperPath}" move ${x} ${y}`);
  } else {
    queueCommand(`powershell -ExecutionPolicy Bypass -File "${scriptPath}" move ${x} ${y}`);
  }
  
  return true;
}

// Click mouse button
function mouseClick(button = 'left') {
  let cmd, fallback = null;
  
  if (useNativeHelper) {
    cmd = `"${helperPath}" click ${button}`;
  } else {
    cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" click -button ${button}`;
  }
  
  if (button === 'left') {
    fallback = 'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'{ENTER}\');"';
  } else {
    fallback = 'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys([char]0x5d);"';
  }
  
  queueCommand(cmd, fallback);
  return true;
}

// Scroll mouse wheel
function scrollMouse(x, y) {
  let cmd;
  
  if (useNativeHelper) {
    cmd = `"${helperPath}" scroll ${y}`;
  } else {
    cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" scroll -y ${y}`;
  }
  
  const fallback = y > 0 
    ? 'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'{PGUP}\');"'
    : 'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'{PGDN}\');"';
  
  queueCommand(cmd, fallback);
  return true;
}

// Press a key
function keyTap(key, modifiers = []) {
  // Map common keys to SendKeys key codes
  const keyMap = {
    'enter': '{ENTER}',
    'return': '{ENTER}',
    'tab': '{TAB}',
    'space': ' ',
    'backspace': '{BACKSPACE}',
    'escape': '{ESC}',
    'up': '{UP}',
    'down': '{DOWN}',
    'left': '{LEFT}',
    'right': '{RIGHT}',
    'home': '{HOME}',
    'end': '{END}',
    'pageup': '{PGUP}',
    'pagedown': '{PGDN}',
    'delete': '{DELETE}',
    'insert': '{INSERT}',
    'control': '^',
    'ctrl': '^',
    'alt': '%',
    'shift': '+',
    'windows': '^{ESC}'
  };
  
  let script;
  
  if (keyMap[key.toLowerCase()]) {
    // It's a special key
    let keyCode = keyMap[key.toLowerCase()];
    
    // Apply modifiers
    if (modifiers && modifiers.length > 0) {
      modifiers.forEach(mod => {
        const modKey = keyMap[mod.toLowerCase()];
        if (modKey) {
          keyCode = modKey + keyCode;
        }
      });
    }
    
    script = `$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${keyCode}');`;
  } else if (key.length === 1) {
    // It's a single character
    script = `$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${key}');`;
  } else {
    // It's a string of text
    // Type each character individually
    const chars = key.split('');
    const charCommands = chars.map(c => `$wshell.SendKeys('${c}');`).join(' ');
    script = `$wshell = New-Object -ComObject wscript.shell; ${charCommands}`;
  }
  
  queueCommand(`powershell -command "${script}"`);
  return true;
}

// Initialize mouse position
global.mousePos = { x: 500, y: 500 };

module.exports = {
  getScreenSize,
  getMousePos,
  moveMouse,
  mouseClick,
  scrollMouse,
  keyTap
};

module.exports = {
  getScreenSize,
  getMousePos,
  moveMouse,
  mouseClick,
  scrollMouse,
  keyTap
};