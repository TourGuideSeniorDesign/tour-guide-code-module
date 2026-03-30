# ROS 2 Humble Workspace

ROS 2 Humble running in a dev container

## Prerequisites

- Docker or Podman
- VSCode compatible IDE with dev containers

## Quick Start

1. Open this folder in VS Code
2. When prompted, click **Reopen in Container** (or run `Dev Containers: Reopen in Container` from the command palette)

## Build

```
colcon build && source install/setup.bash
```

## Run

```
ros2 launch autogiro autogiro.launch.py
```

When connecting the frontend via rosbridge you may need to use `127.0.0.1` instead of `localhost`
