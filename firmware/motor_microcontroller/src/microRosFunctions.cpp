#if defined(ROS) || defined(ROS_DEBUG)
#include "microRosFunctions.h"
#include "BatteryFunctions.h"
#include "globals.h"
#include <micro_ros_platformio.h>
#include <autogiro_interfaces/msg/ref_speed.h>
#include <autogiro_interfaces/msg/brake.h>
#include <autogiro_interfaces/msg/battery.h> // BATTERY
#include <autogiro_interfaces/msg/motors.h>  // Added: for sending wheel speed in MPH
#include <autogiro_interfaces/msg/dac_values.h>

#include <rcl/rcl.h>
#include <rcl/error_handling.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>


bool eBrake = false;


// ROS messages
#ifdef ROS_DEBUG

#include <autogiro_interfaces/msg/sensors.h>
#endif

// Executor
rclc_executor_t executor;

// Subscriber
rcl_subscription_t subscriber;
autogiro_interfaces__msg__RefSpeed refSpeedMsg;

rcl_subscription_t brake_subscriber;
autogiro_interfaces__msg__Brake brakeMsg;

// BATTERY
rcl_publisher_t batteryPublisher;
rcl_timer_t batteryTimer;
autogiro_interfaces__msg__Battery batteryMsg;


// MOTOR MPH
rcl_publisher_t motorPublisher;
rcl_timer_t motorTimer;
autogiro_interfaces__msg__Motors motorMsg;


rcl_publisher_t dacPublisher;
autogiro_interfaces__msg__DacValues dacMsg;


rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;
rcl_timer_t timer;

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


void timer_callback(rcl_timer_t * inputTimer, int64_t last_call_time) {
    RCLC_UNUSED(last_call_time);
    if (inputTimer != NULL) {
        RCSOFTCHECK(rcl_publish(&dacPublisher, &dacMsg, NULL));
    }
}

void battery_timer_callback(rcl_timer_t *input_timer, int64_t last_call_time) {
    RCLC_UNUSED(last_call_time);
    if (input_timer != NULL) {
        float voltage = readBatteryVoltage();
        int8_t percent = calculateBatteryPercentage(voltage);
        batteryMsg.battery_percent = percent;
        RCSOFTCHECK(rcl_publish(&batteryPublisher, &batteryMsg, NULL));
    }
}

//  Directly publish refSpeed in mph no conversio needed
void motor_timer_callback(rcl_timer_t *input_timer, int64_t last_call_time) {
    RCLC_UNUSED(last_call_time);
    if (input_timer != NULL) {
        motorMsg.left_mph = static_cast<int8_t>(speedL);
        motorMsg.right_mph = static_cast<int8_t>(speedR);
        RCSOFTCHECK(rcl_publish(&motorPublisher, &motorMsg, NULL));
    }
}

void transmitDac(int16_t leftDacValue, int16_t rightDacValue) {

    dacMsg.left_dac = leftDacValue;
    dacMsg.right_dac = rightDacValue;
    //RCSOFTCHECK(rclc_executor_spin_some(&executor, RCL_MS_TO_NS(100)));

}


void subscription_callback(const void *msgin)
{
    const autogiro_interfaces__msg__RefSpeed *msg = (const autogiro_interfaces__msg__RefSpeed *)msgin;
    refSpeedMsg = *msg;
#ifdef ROS_DEBUG

    //Try using Serial1 to use a Uart adapter to print this out
//    Serial1.print("Left Speed: ");
//    Serial1.println(msg->left_speed);
//    Serial1.print("Right Speed: ");
//    Serial1.println(msg->right_speed);


    // if (msg->left_speed == 100 || msg->right_speed == 100) {
    //     digitalWrite(LED_BUILTIN, HIGH);
    // } else {
    //     digitalWrite(LED_BUILTIN, LOW);
    // }

#elif ROS

#endif
}


void brake_subscription_callback(const void *msgin)
{
    const autogiro_interfaces__msg__Brake *msg = (const autogiro_interfaces__msg__Brake *)msgin;
    eBrake = msg->brake;
}

bool create_entities(){
    allocator = rcl_get_default_allocator();

    // create init_options
  RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));

  // create node
  RCCHECK(rclc_node_init_default(&node, "motor_node", "", &support));

  RCCHECK(rclc_subscription_init_best_effort(
            &subscriber,
            &node,
            ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, RefSpeed),
            "ref_speed"));

  // Create Brake Subscriber
    RCCHECK(rclc_subscription_init_best_effort(
            &brake_subscriber,
            &node,
            ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Brake),
            "ebrake"));


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


    //  Init motor speed publisher and timer
    RCCHECK(rclc_publisher_init_default(
        &motorPublisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, Motors),
        "motor_speed"));

    RCCHECK(rclc_timer_init_default(
        &motorTimer,
        &support,
        RCL_MS_TO_NS(1000),
        motor_timer_callback));

    RCCHECK(rclc_publisher_init_best_effort(
        &dacPublisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(autogiro_interfaces, msg, DacValues),
        "dac_value"));

    RCCHECK(rclc_timer_init_default(
        &timer,
        &support,
        RCL_MS_TO_NS(500),
        timer_callback));

    //Number of handles = # timers + # subscriptions + # clients + # services
    executor = rclc_executor_get_zero_initialized_executor();
    RCCHECK(rclc_executor_init(&executor, &support.context, 5, &allocator));

    // add sub to executor
    RCCHECK(rclc_executor_add_subscription(&executor, &subscriber, &refSpeedMsg, &subscription_callback, ON_NEW_DATA));

    // Add brake sub to executor
    RCCHECK(rclc_executor_add_subscription(&executor, &brake_subscriber, &brakeMsg, &brake_subscription_callback, ON_NEW_DATA));

    RCCHECK(rclc_executor_add_timer(&executor, &batteryTimer)); // BATTERY: add battery timer to executor

   // Add motor timer to executor
    RCCHECK(rclc_executor_add_timer(&executor, &motorTimer));

    RCCHECK(rclc_executor_add_timer(&executor, &timer));

    state = WAITING_AGENT;

    return true;
}

void destroy_entities() {
    rmw_context_t *rmw_context = rcl_context_get_rmw_context(&support.context);
    (void) rmw_uros_set_context_entity_destroy_session_timeout(rmw_context, 0);

    RCCHECK(rcl_subscription_fini(&subscriber, &node));
    RCCHECK(rcl_subscription_fini(&brake_subscriber, &node));
    RCCHECK(rcl_publisher_fini(&motorPublisher, &node));
    RCCHECK(rcl_publisher_fini(&batteryPublisher, &node));
    RCCHECK(rcl_publisher_fini(&dacPublisher, &node));
    RCCHECK(rcl_timer_fini(&batteryTimer));
    RCCHECK(rcl_timer_fini(&motorTimer));
    RCCHECK(rcl_timer_fini(&timer));
    RCCHECK(rclc_executor_fini(&executor));
    RCCHECK(rcl_node_fini(&node));
    RCCHECK(rclc_support_fini(&support));

}

void microRosTick(){
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


refSpeed getRefSpeed() {
    refSpeed refSpeed;
    refSpeed.leftSpeed = refSpeedMsg.left_speed;
    refSpeed.rightSpeed = refSpeedMsg.right_speed;
    return refSpeed;
}

#endif

