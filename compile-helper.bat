@echo off
echo Compiling mouse-helper.cpp...
g++ -o mouse-helper.exe mouse-helper.cpp -lgdi32 -luser32
if %ERRORLEVEL% EQU 0 (
    echo Compilation successful!
) else (
    echo Compilation failed!
)
pause