#if defined(ROS) || defined(ROS_DEBUG)
#include "microRosFunctions.h"
#include "BatteryMonitor.h"
#include <micro_ros_platformio.h>
#include <autogiro_interfaces/msg/battery.h>

#include <rcl/rcl.h>
#include <rcl/error_handling.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>

// Publisher
rcl_publisher_t batteryPublisher;
rcl_timer_t batteryTimer;
autogiro_interfaces__msg__Battery batteryMsg;

// ROS infrastructure
rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;

enum states {
  WAITING_AGENT,
  AGENT_AVAILABLE,
  AGENT_CONNECTED,
  AGENT_DISCONNECTED
} state;

#define RCCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){error_loop();}}
#define RCSOFTCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){} }

#define EXECUTE_EVERY_N_MS(MS, X)  do { \
  static volatile int64_t init = -1; \
  if (init == -1) { init = uxr_millis();} \
  if (uxr_millis() - init > MS) { X; init = uxr_millis();} \
} while (0)\

void error_loop() {
    while(1) {
        delay(100);
    }
}

void battery_timer_callback(rcl_timer_t *input_timer, int64_t last_call_time) {
    RCLC_UNUSED(last_call_time);
    if (input_timer != NULL) {
        batteryMsg.voltage = getVoltage();
        batteryMsg.current_amps = getCurrentAmps();
        batteryMsg.consumed_ah = getConsumedAh();
        batteryMsg.battery_percent = getBatteryPercent();
        RCSOFTCHECK(rcl_publish(&batteryPublisher, &batteryMsg, NULL));
    }
}

bool create_entities() {
    allocator = rcl_get_default_allocator();

    RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));

    RCCHECK(rclc_node_init_default(&node, "battery_node", "", &support));

    RCCHECK(rclc_publisher_init_default(
        &batteryPublisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Battery),
        "battery_status"));

    RCCHECK(rclc_timer_init_default(
        &batteryTimer,
        &support,
        RCL_MS_TO_NS(3000),
        battery_timer_callback));

    executor = rclc_executor_get_zero_initialized_executor();
    RCCHECK(rclc_executor_init(&executor, &support.context, 1, &allocator));

    RCCHECK(rclc_executor_add_timer(&executor, &batteryTimer));

    state = WAITING_AGENT;

    return true;
}

void destroy_entities() {
    rmw_context_t *rmw_context = rcl_context_get_rmw_context(&support.context);
    (void) rmw_uros_set_context_entity_destroy_session_timeout(rmw_context, 0);

    RCCHECK(rcl_publisher_fini(&batteryPublisher, &node));
    RCCHECK(rcl_timer_fini(&batteryTimer));
    RCCHECK(rclc_executor_fini(&executor));
    RCCHECK(rcl_node_fini(&node));
    RCCHECK(rclc_support_fini(&support));
}

void microRosTick() {
    switch (state) {
        case WAITING_AGENT:
            EXECUTE_EVERY_N_MS(500,
                               state = (RMW_RET_OK == rmw_uros_ping_agent(100, 1)) ? AGENT_AVAILABLE : WAITING_AGENT;);
            break;
        case AGENT_AVAILABLE:
            state = (true == create_entities()) ? AGENT_CONNECTED : WAITING_AGENT;
            if (state == WAITING_AGENT) {
                destroy_entities();
            };
            break;
        case AGENT_CONNECTED:
            EXECUTE_EVERY_N_MS(200, state = (RMW_RET_OK == rmw_uros_ping_agent(100, 1)) ? AGENT_CONNECTED
                                                                                        : AGENT_DISCONNECTED;);
            if (state == AGENT_CONNECTED) {
                rclc_executor_spin_some(&executor, RCL_MS_TO_NS(100));
            }
            break;
        case AGENT_DISCONNECTED:
            destroy_entities();
            state = WAITING_AGENT;
            break;
        default:
            break;
    }
}

#endif
