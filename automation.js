// automation.js - Windows automation using Windows Script Host
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a temporary VBS script file
function createTempVbsFile(content) {
  // Use the system temp directory instead
  const tempDir = require('os').tmpdir();
  const tempFile = path.join(tempDir, `script_${Date.now()}.vbs`);
  fs.writeFileSync(tempFile, content);
  return tempFile;
}

// Run a VBS script and return the output
function runVbsScript(scriptContent) {
  const tempFile = createTempVbsFile(scriptContent);
  try {
    const output = execSync(`cscript //Nologo "${tempFile}"`).toString().trim();
    return output;
  } catch (err) {
    console.error('Error running VBS script:', err);
    return null;
  } finally {
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error('Error deleting temp file:', err);
    }
  }
}

// Get screen size
function getScreenSize() {
  const script = `
Set objWshShell = WScript.CreateObject("WScript.Shell")
Set objWMIService = GetObject("winmgmts:\\\\localhost\\root\\cimv2")
Set colItems = objWMIService.ExecQuery("Select * from Win32_DesktopMonitor")
For Each objItem in colItems
  WScript.Echo objItem.ScreenWidth & "," & objItem.ScreenHeight
  Exit For
Next
`;
  
  const output = runVbsScript(script);
  if (output) {
    const [width, height] = output.split(',').map(Number);
    if (width && height) {
      return { width, height };
    }
  }
  
  // Default fallback values
  return { width: 1920, height: 1080 };
}

// Get mouse position
function getMousePos() {
  const script = `
Set objShell = CreateObject("WScript.Shell")
Set objExec = objShell.Exec("powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $pos = [System.Windows.Forms.Cursor]::Position; Write-Output \""$($pos.X),$($pos.Y)\""""")
WScript.Echo objExec.StdOut.ReadAll
`;
  
  const output = runVbsScript(script);
  if (output) {
    const [x, y] = output.trim().split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) {
      return { x, y };
    }
  }
  
  // Default fallback values
  return { x: 0, y: 0 };
}

// Move mouse to specific coordinates
function moveMouse(x, y) {
  const script = `
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})""", 0, True
`;
  
  runVbsScript(script);
  return true;
}

// Click mouse button
function mouseClick(button = 'left') {
  const script = button === 'right' ? 
    `
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('+{F10}')""", 0, True
` : 
    `
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $cPos = [System.Windows.Forms.Cursor]::Position; $mouse_event = Add-Type -MemberDefinition '[DllImport(\""user32.dll\"",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);' -Name \""Win32MouseEvent\"" -Namespace Win32Functions -PassThru; $mouse_event::mouse_event(0x00000002, 0, 0, 0, 0); $mouse_event::mouse_event(0x00000004, 0, 0, 0, 0);""", 0, True
`;
  
  runVbsScript(script);
  return true;
}

// Scroll mouse wheel
function scrollMouse(x, y) {
  const direction = y > 0 ? 120 : -120;
  const script = `
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $mouse_event = Add-Type -MemberDefinition '[DllImport(\""user32.dll\"",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);' -Name \""Win32MouseEvent\"" -Namespace Win32Functions -PassThru; $mouse_event::mouse_event(0x00000800, 0, 0, ${direction}, 0);""", 0, True
`;
  
  runVbsScript(script);
  return true;
}

// Press a key
function keyTap(key, modifiers = []) {
  // Map common keys to VBS key codes
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
    'f1': '{F1}',
    'f2': '{F2}',
    'f3': '{F3}',
    'f4': '{F4}',
    'f5': '{F5}',
    'f6': '{F6}',
    'f7': '{F7}',
    'f8': '{F8}',
    'f9': '{F9}',
    'f10': '{F10}',
    'f11': '{F11}',
    'f12': '{F12}',
    'control': '^',
    'ctrl': '^',
    'alt': '%',
    'shift': '+',
    'windows': '^{ESC}'
  };

  // Convert key to VBS key code
  let keyCode = keyMap[key.toLowerCase()] || key;
  
  // If it's a single character and not in the map, make it lowercase
  if (keyCode.length === 1 && !Object.values(keyMap).includes(keyCode)) {
    keyCode = keyCode.toLowerCase();
  }
  
  // Apply modifiers
  let modifiedKey = keyCode;
  if (modifiers && modifiers.length > 0) {
    modifiers.forEach(mod => {
      const modKey = keyMap[mod.toLowerCase()];
      if (modKey) {
        modifiedKey = modKey + modifiedKey;
      }
    });
  }
  
  const script = `
Set objShell = CreateObject("WScript.Shell")
objShell.SendKeys "${modifiedKey}"
`;
  
  runVbsScript(script);
  return true;
}

module.exports = {
  getScreenSize,
  getMousePos,
  moveMouse,
  mouseClick,
  scrollMouse,
  keyTap
};