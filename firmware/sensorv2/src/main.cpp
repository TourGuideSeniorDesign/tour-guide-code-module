#include <Arduino.h>
#include <micro_ros_platformio.h>

#include "sensors/Joystick.h"

#include <cstring>

#include <autogiro_interfaces/msg/sensors.h>

#include <rcl/rcl.h>
#include <rclc/executor.h>
#include <rclc/rclc.h>

namespace {
constexpr unsigned long SERIAL_WAIT_MS = 2000;
constexpr unsigned int PUBLISH_PERIOD_MS = 100;

rcl_publisher_t sensorPublisher;
rcl_timer_t sensorTimer;
autogiro_interfaces__msg__Sensors sensorMsg;
sensorv2::Joystick joystick;

rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;

enum State { WAITING_AGENT, AGENT_AVAILABLE, AGENT_CONNECTED, AGENT_DISCONNECTED };
State state = WAITING_AGENT;

#define RCCHECK(fn)                                                            \
  {                                                                            \
    rcl_ret_t temp_rc = fn;                                                    \
    if (temp_rc != RCL_RET_OK) {                                               \
      errorLoop();                                                             \
    }                                                                          \
  }

#define RCSOFTCHECK(fn)                                                        \
  {                                                                            \
    rcl_ret_t temp_rc = fn;                                                    \
    (void)temp_rc;                                                             \
  }

#define EXECUTE_EVERY_N_MS(MS, X)                                              \
  do {                                                                         \
    static volatile int64_t init = -1;                                         \
    if (init == -1) {                                                          \
      init = uxr_millis();                                                     \
    }                                                                          \
    if (uxr_millis() - init > MS) {                                            \
      X;                                                                       \
      init = uxr_millis();                                                     \
    }                                                                          \
  } while (0)

void errorLoop() {
  while (true) {
    delay(100);
  }
}

void waitForSerial(unsigned long timeoutMs) {
  const unsigned long startMs = millis();
  while (!Serial && (millis() - startMs) < timeoutMs) {
    delay(10);
  }
}

void zeroSensorMsg() { memset(&sensorMsg, 0, sizeof(sensorMsg)); }

void updateJoystickFields() {
  const sensorv2::JoystickSample sample = joystick.read();
  sensorMsg.long_disp = sample.longDisp;
  sensorMsg.lat_disp = sample.latDisp;
  sensorMsg.left_speed = sample.leftSpeed;
  sensorMsg.right_speed = sample.rightSpeed;
}

void updateSensorMsg() {
  zeroSensorMsg();
  updateJoystickFields();
}

void sensorTimerCallback(rcl_timer_t *timer, int64_t lastCallTime) {
  RCLC_UNUSED(lastCallTime);
  if (timer != nullptr) {
    RCSOFTCHECK(rcl_publish(&sensorPublisher, &sensorMsg, nullptr));
  }
}

bool createEntities() {
  allocator = rcl_get_default_allocator();

  RCCHECK(rclc_support_init(&support, 0, nullptr, &allocator));
  RCCHECK(rclc_node_init_default(&node, "sensorv2_node", "", &support));

  RCCHECK(rclc_publisher_init_best_effort(
      &sensorPublisher, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Sensors),
      "sensors"));

  RCCHECK(rclc_timer_init_default(&sensorTimer, &support,
                                  RCL_MS_TO_NS(PUBLISH_PERIOD_MS),
                                  sensorTimerCallback));

  executor = rclc_executor_get_zero_initialized_executor();
  RCCHECK(rclc_executor_init(&executor, &support.context, 1, &allocator));
  RCCHECK(rclc_executor_add_timer(&executor, &sensorTimer));

  zeroSensorMsg();
  return true;
}

void destroyEntities() {
  rmw_context_t *rmwContext = rcl_context_get_rmw_context(&support.context);
  (void)rmw_uros_set_context_entity_destroy_session_timeout(rmwContext, 0);

  RCSOFTCHECK(rcl_publisher_fini(&sensorPublisher, &node));
  RCSOFTCHECK(rcl_timer_fini(&sensorTimer));
  RCSOFTCHECK(rclc_executor_fini(&executor));
  RCSOFTCHECK(rcl_node_fini(&node));
  RCSOFTCHECK(rclc_support_fini(&support));
}

void microRosTick() {
  switch (state) {
  case WAITING_AGENT:
    EXECUTE_EVERY_N_MS(500, state = (RMW_RET_OK == rmw_uros_ping_agent(100, 1))
                                        ? AGENT_AVAILABLE
                                        : WAITING_AGENT;);
    break;
  case AGENT_AVAILABLE:
    state = createEntities() ? AGENT_CONNECTED : WAITING_AGENT;
    if (state == WAITING_AGENT) {
      destroyEntities();
    }
    break;
  case AGENT_CONNECTED:
    EXECUTE_EVERY_N_MS(200, state = (RMW_RET_OK == rmw_uros_ping_agent(100, 1))
                                        ? AGENT_CONNECTED
                                        : AGENT_DISCONNECTED;);
    if (state == AGENT_CONNECTED) {
      RCSOFTCHECK(rclc_executor_spin_some(&executor, RCL_MS_TO_NS(100)));
    }
    break;
  case AGENT_DISCONNECTED:
    destroyEntities();
    state = WAITING_AGENT;
    break;
  }
}
} // namespace

void setup() {
  Serial.begin(115200);
  waitForSerial(SERIAL_WAIT_MS);

  zeroSensorMsg();
  joystick.begin();

  set_microros_serial_transports(Serial);
  delay(2000);
}

void loop() {
  updateSensorMsg();
  microRosTick();
  delay(10);
}
