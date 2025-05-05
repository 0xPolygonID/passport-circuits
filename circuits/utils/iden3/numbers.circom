pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
 
// Check if int fits to size
template CheckMaxBits(bitSize) {
    signal input inputInteger;
    signal output isValid;

    // Check if the input fits within the specified number of bits
    component checkBits = Num2Bits(bitSize);
    checkBits.in <== inputInteger;

    // If the input fits, set isValid to 1; otherwise, the circuit will fail
    isValid <== 1;
}