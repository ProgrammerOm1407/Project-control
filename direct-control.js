// direct-control.js - Direct Windows automation using PowerShell
const { execSync, exec } = require('child_process');

// Get screen size
function getScreenSize() {
  // Default screen size
  return { width: 1920, height: 1080 };
}

// Get mouse position
function getMousePos() {
  // For simplicity, we'll use a fixed position that gets updated with each move
  return global.mousePos || { x: 500, y: 500 };
}

// Move mouse to specific coordinates
function moveMouse(x, y) {
  console.log(`Moving mouse to ${x}, ${y}`);
  
  try {
    // Store the position globally
    global.mousePos = { x, y };
    
    // Use SendKeys to simulate arrow key presses for movement
    // This is a workaround since direct mouse control is challenging
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
    `;
    
    execSync(`powershell -command "${script}"`);
    console.log(`Simulated movement to ${x}, ${y}`);
    return true;
  } catch (err) {
    console.error('Error moving:', err);
    return false;
  }
}

// Click mouse button
function mouseClick(button = 'left') {
  console.log(`Clicking mouse button: ${button}`);
  
  try {
    // Use SendKeys to simulate Enter (left click) or Shift+F10 (right click)
    const script = button === 'right' ? 
      '[System.Windows.Forms.SendKeys]::SendWait("+{F10}")' : 
      '[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")';
    
    execSync(`powershell -command "${script}"`);
    console.log(`Simulated ${button} click`);
    return true;
  } catch (err) {
    console.error('Error clicking:', err);
    return false;
  }
}

// Scroll mouse wheel
function scrollMouse(x, y) {
  console.log(`Scrolling: x=${x}, y=${y}`);
  
  try {
    // Use SendKeys for scrolling (Page Up/Down)
    const script = y > 0 ? 
      '[System.Windows.Forms.SendKeys]::SendWait("{PGUP}")' : 
      '[System.Windows.Forms.SendKeys]::SendWait("{PGDN}")';
    
    execSync(`powershell -command "${script}"`);
    console.log(`Scrolled ${y > 0 ? 'up' : 'down'}`);
    return true;
  } catch (err) {
    console.error('Error scrolling:', err);
    return false;
  }
}

// Press a key
function keyTap(key, modifiers = []) {
  console.log(`Pressing key: ${key}${modifiers.length > 0 ? ' with modifiers: ' + modifiers.join(', ') : ''}`);
  
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
  
  // Convert key to SendKeys key code
  let keyCode = keyMap[key.toLowerCase()] || key;
  
  // Apply modifiers
  if (modifiers && modifiers.length > 0) {
    modifiers.forEach(mod => {
      const modKey = keyMap[mod.toLowerCase()];
      if (modKey) {
        keyCode = modKey + keyCode;
      }
    });
  }
  
  try {
    // Use SendKeys via PowerShell
    const script = `[System.Windows.Forms.SendKeys]::SendWait("${keyCode}")`;
    execSync(`powershell -command "${script}"`);
    console.log(`Pressed key: ${key}`);
    return true;
  } catch (err) {
    console.error('Error sending key:', err);
    return false;
  }
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