pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
 
// Check if int fits to size
template CheckMaxBits(bitSize) {
    signal input inputInteger;
    
    // Check if the input fits within the specified number of bits
    component checkBits = Num2Bits(bitSize);
    checkBits.in <== inputInteger;
}