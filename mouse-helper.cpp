#include <windows.h>
#include <iostream>
#include <string>

// Usage: mouse-helper.exe [move|click|scroll] [params]
int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: mouse-helper.exe [move|click|scroll|getpos] [params]" << std::endl;
        return 1;
    }

    std::string command = argv[1];

    if (command == "move") {
        if (argc < 4) {
            std::cerr << "Usage: mouse-helper.exe move <x> <y>" << std::endl;
            return 1;
        }

        int x = std::stoi(argv[2]);
        int y = std::stoi(argv[3]);
        
        // Set cursor position
        SetCursorPos(x, y);
    }
    else if (command == "click") {
        std::string button = "left";
        if (argc >= 3) {
            button = argv[2];
        }

        INPUT input[2] = {0};
        
        // Set up the INPUT structure for mouse down
        input[0].type = INPUT_MOUSE;
        if (button == "right") {
            input[0].mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
            input[1].mi.dwFlags = MOUSEEVENTF_RIGHTUP;
        } else {
            input[0].mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
            input[1].mi.dwFlags = MOUSEEVENTF_LEFTUP;
        }
        
        // Set up the INPUT structure for mouse up
        input[1].type = INPUT_MOUSE;
        
        // Send the input
        SendInput(2, input, sizeof(INPUT));
    }
    else if (command == "scroll") {
        if (argc < 3) {
            std::cerr << "Usage: mouse-helper.exe scroll <amount>" << std::endl;
            return 1;
        }

        int amount = std::stoi(argv[2]);
        
        // Set up the INPUT structure for mouse wheel
        INPUT input = {0};
        input.type = INPUT_MOUSE;
        input.mi.dwFlags = MOUSEEVENTF_WHEEL;
        input.mi.mouseData = amount;
        
        // Send the input
        SendInput(1, &input, sizeof(INPUT));
    }
    else if (command == "getpos") {
        POINT p;
        if (GetCursorPos(&p)) {
            std::cout << p.x << "," << p.y << std::endl;
        } else {
            std::cerr << "Failed to get cursor position" << std::endl;
            return 1;
        }
    }
    else {
        std::cerr << "Unknown command: " << command << std::endl;
        return 1;
    }

    return 0;
}