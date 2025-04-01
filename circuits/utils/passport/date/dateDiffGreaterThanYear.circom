pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";

template DateDiffGreaterThanYear() {
    signal input currentTimestamp;
    signal input expirationTimestamp;
    signal output expiration;

    // Constant representing one year in seconds
    var ONE_YEAR_SECONDS = 31536000;

    // Calculate difference
    signal diff;
    diff <== expirationTimestamp - currentTimestamp;

    // Ensure difference is non-negative (expirationTimestamp >= currentTimestamp)
    component isNonNegative = GreaterEqThan(32);
    isNonNegative.in[0] <== diff;
    isNonNegative.in[1] <== 0;
    isNonNegative.out === 1;

    // Comparator to check if diff is >= ONE_YEAR_SECONDS
    component isGreaterEq = GreaterEqThan(32);
    isGreaterEq.in[0] <== diff;
    isGreaterEq.in[1] <== ONE_YEAR_SECONDS;

    // Multiplexer for conditional logic
    component expirationMux = Mux1();
    expirationMux.s <== isGreaterEq.out;
    expirationMux.c[0] <== expirationTimestamp;
    expirationMux.c[1] <== currentTimestamp + ONE_YEAR_SECONDS;

    expiration <== expirationMux.out;
}