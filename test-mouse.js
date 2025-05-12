// test-mouse.js - Test mouse control
const { execSync } = require('child_process');

console.log('Testing mouse control...');

// Try to get the current mouse position
try {
  const posScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $pos = [System.Windows.Forms.Cursor]::Position
    Write-Output "$($pos.X),$($pos.Y)"
  `;
  
  const posOutput = execSync(`powershell -command "${posScript}"`).toString().trim();
  console.log('Current mouse position:', posOutput);
  
  // Try to move the mouse to a specific position
  const moveScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(500, 500)
  `;
  
  console.log('Moving mouse to 500, 500...');
  execSync(`powershell -command "${moveScript}"`);
  
  // Check the new position
  const newPosOutput = execSync(`powershell -command "${posScript}"`).toString().trim();
  console.log('New mouse position:', newPosOutput);
  
  // Try to click
  const clickScript = `
    Add-Type -AssemblyName System.Windows.Forms
    
    # Define the mouse_event function
    $mouseEventSignature=@'
    [DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
'@
    
    $mouseEvent = Add-Type -MemberDefinition $mouseEventSignature -Name "MouseEventWinApi" -Namespace "WinApi" -PassThru
    
    # Constants for mouse_event
    $MOUSEEVENTF_LEFTDOWN = 0x0002
    $MOUSEEVENTF_LEFTUP = 0x0004
    
    # Perform click
    $mouseEvent::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 10
    $mouseEvent::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
  `;
  
  console.log('Clicking...');
  execSync(`powershell -command "${clickScript}"`);
  
  console.log('Test completed successfully!');
} catch (err) {
  console.error('Test failed:', err);
}