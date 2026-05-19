#if defined(ROS) || defined(ROS_DEBUG)
#include "microRosFunctions.h"
#include "globals.h"
#include <micro_ros_platformio.h>
#include <autogiro_interfaces/msg/brake.h>
#include <autogiro_interfaces/msg/dac_values.h>
#include <autogiro_interfaces/msg/motors.h>
#include <autogiro_interfaces/msg/ref_speed.h>

#include <rcl/rcl.h>
#include <rcl/error_handling.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>


bool eBrake = false;

// ---- Subscriptions ----
rcl_subscription_t refSpeedSubscriber;
rcl_subscription_t brakeSubscriber;
autogiro_interfaces__msg__RefSpeed refSpeedMsg;
autogiro_interfaces__msg__Brake    brakeMsg;

// ---- Publishers ----
rcl_publisher_t motorPublisher;        // /motor_speed (Motors): measured wheel speed in mph
rcl_publisher_t dacPublisher;          // /dac_value (DacValues): commanded DAC counts
autogiro_interfaces__msg__Motors    motorMsg;
autogiro_interfaces__msg__DacValues dacMsg;

// ---- ROS infrastructure ----
rclc_executor_t executor;
rclc_support_t  support;
rcl_allocator_t allocator;
rcl_node_t      node;
rcl_timer_t     motorTimer;            // 10 Hz: publish motorMsg
rcl_timer_t     dacTimer;              // 10 Hz: publish dacMsg

enum AgentState {
    WAITING_AGENT,
    AGENT_AVAILABLE,
    AGENT_CONNECTED,
    AGENT_DISCONNECTED,
};
AgentState state;

#define RCCHECK(fn)     { rcl_ret_t rc = fn; if (rc != RCL_RET_OK) error_loop(); }
#define RCSOFTCHECK(fn) { rcl_ret_t rc = fn; (void)rc; }

#define EXECUTE_EVERY_N_MS(MS, X) do { \
    static volatile int64_t init = -1; \
    if (init == -1) init = uxr_millis(); \
    if (uxr_millis() - init > MS) { X; init = uxr_millis(); } \
} while (0)

static void error_loop() {
    while (1) delay(100);
}

static void dac_timer_callback(rcl_timer_t *t, int64_t /*last_call*/) {
    if (t != nullptr) RCSOFTCHECK(rcl_publish(&dacPublisher, &dacMsg, NULL));
}

static void motor_timer_callback(rcl_timer_t *t, int64_t /*last_call*/) {
    if (t == nullptr) return;
    motorMsg.left_mph  = speedL;
    motorMsg.right_mph = speedR;
    RCSOFTCHECK(rcl_publish(&motorPublisher, &motorMsg, NULL));
}

static void ref_speed_callback(const void *msgin) {
    refSpeedMsg = *static_cast<const autogiro_interfaces__msg__RefSpeed *>(msgin);
}

static void brake_callback(const void *msgin) {
    eBrake = static_cast<const autogiro_interfaces__msg__Brake *>(msgin)->brake;
}

void transmitDac(int16_t leftDacValue, int16_t rightDacValue) {
    dacMsg.left_dac  = leftDacValue;
    dacMsg.right_dac = rightDacValue;
}

static bool create_entities() {
    allocator = rcl_get_default_allocator();
    RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));
    RCCHECK(rclc_node_init_default(&node, "motor_node", "", &support));

    RCCHECK(rclc_subscription_init_best_effort(
        &refSpeedSubscriber, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, RefSpeed),
        "ref_speed"));

    RCCHECK(rclc_subscription_init_best_effort(
        &brakeSubscriber, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Brake),
        "ebrake"));

    RCCHECK(rclc_publisher_init_default(
        &motorPublisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Motors),
        "motor_speed"));

    RCCHECK(rclc_publisher_init_best_effort(
        &dacPublisher, &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, DacValues),
        "dac_value"));

    RCCHECK(rclc_timer_init_default(&motorTimer, &support, RCL_MS_TO_NS(100), motor_timer_callback));
    RCCHECK(rclc_timer_init_default(&dacTimer,   &support, RCL_MS_TO_NS(100), dac_timer_callback));

    // Handles = 2 subscriptions + 2 timers
    executor = rclc_executor_get_zero_initialized_executor();
    RCCHECK(rclc_executor_init(&executor, &support.context, 4, &allocator));
    RCCHECK(rclc_executor_add_subscription(&executor, &refSpeedSubscriber, &refSpeedMsg, &ref_speed_callback, ON_NEW_DATA));
    RCCHECK(rclc_executor_add_subscription(&executor, &brakeSubscriber,    &brakeMsg,    &brake_callback,     ON_NEW_DATA));
    RCCHECK(rclc_executor_add_timer(&executor, &motorTimer));
    RCCHECK(rclc_executor_add_timer(&executor, &dacTimer));

    state = WAITING_AGENT;
    return true;
}

static void destroy_entities() {
    rmw_context_t *rmw_context = rcl_context_get_rmw_context(&support.context);
    (void) rmw_uros_set_context_entity_destroy_session_timeout(rmw_context, 0);

    RCCHECK(rcl_subscription_fini(&refSpeedSubscriber, &node));
    RCCHECK(rcl_subscription_fini(&brakeSubscriber,    &node));
    RCCHECK(rcl_publisher_fini(&motorPublisher, &node));
    RCCHECK(rcl_publisher_fini(&dacPublisher,   &node));
    RCCHECK(rcl_timer_fini(&motorTimer));
    RCCHECK(rcl_timer_fini(&dacTimer));
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
        state = create_entities() ? AGENT_CONNECTED : WAITING_AGENT;
        if (state == WAITING_AGENT) destroy_entities();
        break;
    case AGENT_CONNECTED:
        EXECUTE_EVERY_N_MS(200,
            state = (RMW_RET_OK == rmw_uros_ping_agent(100, 1)) ? AGENT_CONNECTED : AGENT_DISCONNECTED;);
        if (state == AGENT_CONNECTED) rclc_executor_spin_some(&executor, RCL_MS_TO_NS(100));
        break;
    case AGENT_DISCONNECTED:
        destroy_entities();
        state = WAITING_AGENT;
        break;
    }
}

refSpeed getRefSpeed() {
    return { refSpeedMsg.left_speed, refSpeedMsg.right_speed };
}

#endif // ROS || ROS_DEBUG
