pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";

template CountTrailing(stringSize) {
    signal input string[stringSize];
    signal input symbol;
    signal output count;

    signal trailingLessThan[stringSize];
    signal isCounting[stringSize];
    signal accumulatedCount[stringSize];

    // Initialize the first value of accumulatedCount and isCounting
    accumulatedCount[0] <== 0;
    isCounting[0] <== 1; // Start counting from the last character

    component eq[stringSize];
    component mux[stringSize];

    for (var i = 0; i < stringSize; i++) {
        // Check if the character is '<'
        eq[i] = IsEqual();
        eq[i].in[0] <== string[stringSize - 1 - i];
        eq[i].in[1] <== symbol;

        // Use a multiplexer to stop counting if a non-`<` symbol is encountered
        mux[i] = Mux1();
        mux[i].s <== isCounting[i];
        mux[i].c[0] <== 0; // Stop counting
        mux[i].c[1] <== eq[i].out; // Continue counting

        trailingLessThan[i] <== mux[i].out;

        // Update isCounting for the next iteration
        if (i < stringSize - 1) {
            isCounting[i + 1] <== isCounting[i] * eq[i].out;
        }

        // Accumulate the count of trailing '<'
        if (i > 0) {
            accumulatedCount[i] <== accumulatedCount[i - 1] + trailingLessThan[i];
        }
    }

    // Assign the final count
    count <== accumulatedCount[stringSize - 1] + trailingLessThan[0];
}