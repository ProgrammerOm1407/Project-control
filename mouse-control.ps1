# mouse-control.ps1 - Optimized PowerShell script for mouse control

param (
    [string]$action,
    [int]$x = 0,
    [int]$y = 0,
    [string]$button = "left"
)

# Add required .NET types - only once per session
if (-not ("MouseControl" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MouseControl {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
    
    public struct POINT {
        public int X;
        public int Y;
    }
    
    // Mouse event constants
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;
    
    public static void MoveMouse(int x, int y) {
        SetCursorPos(x, y);
    }
    
    public static void LeftClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
    
    public static void RightClick() {
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    }
    
    public static void Scroll(int amount) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)amount, 0);
    }
    
    public static POINT GetPosition() {
        POINT point;
        GetCursorPos(out point);
        return point;
    }
}
"@
}

# Process the requested action - minimal output for performance
switch ($action) {
    "move" {
        [MouseControl]::MoveMouse($x, $y)
        # No output for better performance
    }
    "click" {
        if ($button -eq "right") {
            [MouseControl]::RightClick()
        } else {
            [MouseControl]::LeftClick()
        }
        # No output for better performance
    }
    "scroll" {
        [MouseControl]::Scroll($y)
        # No output for better performance
    }
    "getpos" {
        $pos = [MouseControl]::GetPosition()
        Write-Output "$($pos.X),$($pos.Y)"
    }
    default {
        # No output for unknown actions
    }
}