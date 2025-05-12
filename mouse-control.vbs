Option Explicit

' Check command line arguments
If WScript.Arguments.Count < 1 Then
    WScript.Echo "Usage: cscript mouse-control.vbs [command] [params]"
    WScript.Quit
End If

Dim command
command = WScript.Arguments(0)

' Process commands
Select Case command
    Case "move"
        If WScript.Arguments.Count < 3 Then
            WScript.Echo "Usage: cscript mouse-control.vbs move [x] [y]"
            WScript.Quit
        End If
        
        Dim x, y
        x = CInt(WScript.Arguments(1))
        y = CInt(WScript.Arguments(2))
        
        MoveMouse x, y
        
    Case "click"
        Dim button
        If WScript.Arguments.Count < 2 Then
            button = "left"
        Else
            button = WScript.Arguments(1)
        End If
        
        ClickMouse button
        
    Case "getpos"
        Dim pos
        pos = GetMousePos()
        WScript.Echo pos
        
    Case "getscreen"
        Dim screen
        screen = GetScreenSize()
        WScript.Echo screen
        
    Case Else
        WScript.Echo "Unknown command: " & command
End Select

' Move the mouse to specific coordinates
Sub MoveMouse(x, y)
    ' Create Shell object
    Dim shell
    Set shell = CreateObject("WScript.Shell")
    
    ' Use PowerShell to move the mouse
    Dim command
    command = "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(" & x & ", " & y & ")"""
    
    shell.Run command, 0, True
End Sub

' Click the mouse
Sub ClickMouse(button)
    ' Create Shell object
    Dim shell
    Set shell = CreateObject("WScript.Shell")
    
    ' Use PowerShell to click the mouse
    Dim command
    If button = "right" Then
        command = "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('+{F10}')"""
    Else
        command = "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $cPos = [System.Windows.Forms.Cursor]::Position; $mouse_event = Add-Type -MemberDefinition '[DllImport(\""user32.dll\"",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);' -Name \""Win32MouseEvent\"" -Namespace Win32Functions -PassThru; $mouse_event::mouse_event(0x00000002, 0, 0, 0, 0); $mouse_event::mouse_event(0x00000004, 0, 0, 0, 0);"""
    End If
    
    shell.Run command, 0, True
End Sub

' Get the current mouse position
Function GetMousePos()
    ' Create Shell object
    Dim shell
    Set shell = CreateObject("WScript.Shell")
    
    ' Use PowerShell to get the mouse position
    Dim command
    command = "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $pos = [System.Windows.Forms.Cursor]::Position; Write-Output \""$($pos.X),$($pos.Y)\""""
    
    Dim exec
    Set exec = shell.Exec(command)
    
    ' Get the output
    Dim output
    output = exec.StdOut.ReadAll
    
    ' Return the output
    GetMousePos = Trim(output)
End Function

' Get the screen size
Function GetScreenSize()
    ' Create Shell object
    Dim shell
    Set shell = CreateObject("WScript.Shell")
    
    ' Use PowerShell to get the screen size
    Dim command
    command = "powershell -command ""Add-Type -AssemblyName System.Windows.Forms; $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output \""$($screen.Width),$($screen.Height)\""""
    
    Dim exec
    Set exec = shell.Exec(command)
    
    ' Get the output
    Dim output
    output = exec.StdOut.ReadAll
    
    ' Return the output
    GetScreenSize = Trim(output)
End Function