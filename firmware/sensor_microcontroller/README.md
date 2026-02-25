[![PlatformIO CI](https://github.com/WheelchairSeniorDesign/SensorMicrocontroller/actions/workflows/Platformio_CI.yml/badge.svg)](https://github.com/WheelchairSeniorDesign/SensorMicrocontroller/actions/workflows/Platformio_CI.yml)

# About
this repo is for all the code related to the microcontroller system for our wheelchair.

# Contributing Guidelines

### Development Environent Setup
1. Install a C/C++ IDE  which supports PlatformIO (e.g. [Visual Studio Code](https://code.visualstudio.com/), [CLion](https://www.jetbrains.com/clion/)).
2. Install [PlatformIO](https://platformio.org/install/) as an extension in your IDE.
3. Open any project folder in your IDE.
4. Open the PlatformIO Home from the PlatformIO extension in your IDE.
5. Build the project using the PlatformIO build button.
6. Upload the project to the Rapspberry Pi Pico using the PlatformIO upload button.
7. Open the serial monitor to view the output of the Pico. (If using Clion, don't use the upload and monitor button, instead use the Clion Serial Monitor Plugin)
8. Make changes to the code and test them on the Pico.
9. If you are going to add new libraries to the project, add them to the `platformio.ini` file.
10. Make sure that you develop your changes in a separate branch in Git

### Code Style
Please put all `.c/cpp` files in the src directory and the corrisponding `.h` files in the include directory. Please break out subsystems into new files to keep the main file clean. Also please leave function descriptions above your function declarations.

### Pull Request Guidelines
Please write a brief decription of what your code changed, and why you made those changes. Set yourself as the assignee, and assign someone on the team as the reviewer. Do not merge your code until at least 1 person on the team has reviewed it and given approval.
