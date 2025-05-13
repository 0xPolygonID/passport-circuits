pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/poseidon.circom";

template LinkID() {
    signal input dg1Hash;
    signal input linkNonce;

    signal output out;

    out <== Poseidon(2)([dg1Hash, linkNonce]);
}
