#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source ~/.bashrc
source /opt/ros/humble/setup.bash
source ~/ws_livox/install/setup.bash
source ~/microros_ws/install/setup.bash

source "$SCRIPT_DIR/install/setup.bash"


export LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:/usr/local/lib #used for the lidar
export PATH="/home/bad/.local/bin:$PATH"
export CUDA_HOME=/usr/local/cuda
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda/lib64:/usr/local/cuda/extras/CUPTI/lib64
export PATH=$PATH:$CUDA_HOME/bin
. "$HOME/.cargo/env"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion


# Load remote-management env so ADMIN_USERNAME/PASSWORD/REMOTE_LOG_URL
# are visible to the ROS nodes that POST logs.
if [ -f "$SCRIPT_DIR/remote-management/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/remote-management/.env"
  set +a
fi

# Track PIDs
PIDS=()


# Function to watch for /dev/ttyACM* devices and start micro_ros_agent
watch_and_start_agents() {
  declare -A seen
  while true; do
    for dev in /dev/ttyACM*; do
      [[ -e "$dev" ]] || continue
      if [[ -z "${seen[$dev]}" ]]; then
        echo "Starting micro_ros_agent for $dev"
        ros2 run micro_ros_agent micro_ros_agent serial --dev "$dev" -b 115200 &
        seen[$dev]=1
        # Stop after starting 3 agents
        if [ "${#seen[@]}" -ge 3 ]; then
          return
        fi
      fi
    done
    sleep 1
  done
}

# Cleanup function on Ctrl+C
cleanup() {
  echo "Caught Ctrl+C, killing child processes..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
  kill 0  # kill all child processes in this process group
  exit 0
}

trap cleanup SIGINT

# Start processes and track their PIDs
watch_and_start_agents &
PIDS+=($!)

echo "Starting tour guide module..."
ros2 launch autogiro autogiro.launch.py &
PIDS+=($!)


echo "Publishing static transform from base_link to livox_frame..."
sleep 1
ros2 run tf2_ros static_transform_publisher \
  --x 0 --y 0 --z 0 --roll 3.14159 --pitch 0 --yaw 0 \
  --frame-id base_link --child-frame-id livox_frame \
  --ros-args -p use_sim_time:=false &
PIDS+=($!)

echo "Starting lidar driver..."
(cd ~/ws_livox/src/livox_ros_driver2/config && ros2 launch livox_ros_driver2 rviz_MID360_launch.py) &
PIDS+=($!)


echo "Starting pointcloud_to_laserscan..."
ros2 run pointcloud_to_laserscan pointcloud_to_laserscan_node \
  --ros-args \
    -r cloud_in:=/livox/lidar \
    -r scan:=/scan \
    -p target_frame:=livox_frame \
    -p min_height:=-0.5 \
    -p max_height:=1.0 \
    -p angle_min:=-3.14 \
    -p angle_max:=3.14 \
    -p range_min:=0.2 \
    -p range_max:=120.0 \
    -p use_inf:=true \
    -p use_sim_time:=false \
    -p transform_tolerance:=0.1 \
  &
PIDS+=($!)

echo "Starting SLAM Toolbox..."
ros2 launch slam_toolbox online_async_launch.py \
  use_sim_time:=false \
  slam_params_file:="$SCRIPT_DIR/config/slam_toolbox_online_async.yaml" &
PIDS+=($!)

# echo "Starting Nav2 module..."
# ros2 launch wheelchair_nav2 wheelchair_nav2_launch.py params_file:=/src/nav2_params.yaml &
# PIDS+=($!)


echo "Starting Electron GUI..."
(cd "$SCRIPT_DIR/frontend" && npm start) &
PIDS+=($!)

echo "Starting autogiro_admin_bridge (ROS -> HTTP)..."
ros2 run autogiro_admin_bridge bridge &
PIDS+=($!)

echo "Starting remote-management admin..."
(cd "$SCRIPT_DIR/remote-management" && bash run.sh) &
PIDS+=($!)

# Wait for all background jobs
wait
