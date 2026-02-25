//
// Functions created by Nam
// Modified by Robbie
//

#ifndef PIRFUNCTIONS_H
#define PIRFUNCTIONS_H


#define PIR_0 10
#define PIR_1 11
#define PIR_2 12
#define PIR_3 13

struct PIRSensors {
    bool pir0;
    bool pir1;
    bool pir2;
    bool pir3;
};

//TODO add comments for all the functions

void setupPIR();

bool readPIRSingle(uint8_t pirPin);

PIRSensors readAllPIR();

#endif //PIRFUNCTIONS_H
