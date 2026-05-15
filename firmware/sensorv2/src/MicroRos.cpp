#include "MicroRos.h"

#include <micro_ros_platformio.h>

#include <autogiro_interfaces/msg/sensor_error.h>
#include <autogiro_interfaces/msg/sensors.h>

#include <rcl/rcl.h>
#include <rclc/executor.h>
#include <rclc/rclc.h>

#include <cstring>

namespace sensorv2 {
namespace microros {
namespace {

constexpr unsigned int kPublishPeriodMs = 10;

enum class State : uint8_t {
  WaitingAgent,
  AgentAvailable,
  AgentConnected,
  AgentDisconnected,
};

rcl_publisher_t sensorPublisher;
rcl_publisher_t errorPublisher;
rcl_timer_t sensorTimer;

rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;

autogiro_interfaces__msg__Sensors sensorMessage;

State state = State::WaitingAgent;
bool entitiesAlive = false;

#define RC_SOFT_CHECK(fn)                                                      \
  do {                                                                         \
    rcl_ret_t temp_rc = (fn);                                                  \
    (void)temp_rc;                                                             \
  } while (0)

#define EXECUTE_EVERY_N_MS(MS, X)                                              \
  do {                                                                         \
    static volatile int64_t init = -1;                                         \
    if (init == -1) {                                                          \
      init = uxr_millis();                                                     \
    }                                                                          \
    if (uxr_millis() - init > (MS)) {                                          \
      X;                                                                       \
      init = uxr_millis();                                                     \
    }                                                                          \
  } while (0)

void sensorTimerCallback(rcl_timer_t *timer, int64_t lastCallTime) {
  RCLC_UNUSED(lastCallTime);
  if (timer != nullptr) {
    RC_SOFT_CHECK(rcl_publish(&sensorPublisher, &sensorMessage, nullptr));
  }
}

bool createEntities() {
  allocator = rcl_get_default_allocator();

  if (rclc_support_init(&support, 0, nullptr, &allocator) != RCL_RET_OK) {
    return false;
  }
  if (rclc_node_init_default(&node, "sensors_node", "", &support) !=
      RCL_RET_OK) {
    return false;
  }
  if (rclc_publisher_init_best_effort(
          &sensorPublisher, &node,
          ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Sensors),
          "sensors") != RCL_RET_OK) {
    return false;
  }
  if (rclc_publisher_init_default(
          &errorPublisher, &node,
          ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, SensorError),
          "sensor_error") != RCL_RET_OK) {
    return false;
  }
  if (rclc_timer_init_default(&sensorTimer, &support,
                              RCL_MS_TO_NS(kPublishPeriodMs),
                              sensorTimerCallback) != RCL_RET_OK) {
    return false;
  }

  executor = rclc_executor_get_zero_initialized_executor();
  if (rclc_executor_init(&executor, &support.context, 1, &allocator) !=
      RCL_RET_OK) {
    return false;
  }
  if (rclc_executor_add_timer(&executor, &sensorTimer) != RCL_RET_OK) {
    return false;
  }

  entitiesAlive = true;
  return true;
}

void destroyEntities() {
  if (!entitiesAlive) {
    return;
  }
  rmw_context_t *rmwContext = rcl_context_get_rmw_context(&support.context);
  (void)rmw_uros_set_context_entity_destroy_session_timeout(rmwContext, 0);

  RC_SOFT_CHECK(rcl_publisher_fini(&sensorPublisher, &node));
  RC_SOFT_CHECK(rcl_publisher_fini(&errorPublisher, &node));
  RC_SOFT_CHECK(rcl_timer_fini(&sensorTimer));
  RC_SOFT_CHECK(rclc_executor_fini(&executor));
  RC_SOFT_CHECK(rcl_node_fini(&node));
  RC_SOFT_CHECK(rclc_support_fini(&support));

  entitiesAlive = false;
}

} // namespace

void begin() {
  std::memset(&sensorMessage, 0, sizeof(sensorMessage));
  set_microros_serial_transports(Serial);
}

void tick() {
  switch (state) {
  case State::WaitingAgent:
    EXECUTE_EVERY_N_MS(500,
                       state = (rmw_uros_ping_agent(100, 1) == RMW_RET_OK)
                                   ? State::AgentAvailable
                                   : State::WaitingAgent;);
    break;

  case State::AgentAvailable:
    if (createEntities()) {
      state = State::AgentConnected;
    } else {
      destroyEntities();
      state = State::WaitingAgent;
    }
    break;

  case State::AgentConnected:
    EXECUTE_EVERY_N_MS(200,
                       state = (rmw_uros_ping_agent(100, 1) == RMW_RET_OK)
                                   ? State::AgentConnected
                                   : State::AgentDisconnected;);
    if (state == State::AgentConnected) {
      RC_SOFT_CHECK(rclc_executor_spin_some(&executor, RCL_MS_TO_NS(100)));
    }
    break;

  case State::AgentDisconnected:
    destroyEntities();
    state = State::WaitingAgent;
    break;
  }
}

bool connected() { return state == State::AgentConnected; }

autogiro_interfaces__msg__Sensors &sensorMsg() { return sensorMessage; }

bool publishError(const SensorErrors &errors) {
  if (!connected()) {
    return false;
  }
  autogiro_interfaces__msg__SensorError msg;
  msg.joystick_adc_error = errors.joystickAdc;
  msg.ultrasonic_adc_error = errors.ultrasonicAdc;
  msg.fingerprint_error = errors.fingerprint;
  msg.imu_error = errors.imu;
  RC_SOFT_CHECK(rcl_publish(&errorPublisher, &msg, nullptr));
  return true;
}

} // namespace microros
} // namespace sensorv2
