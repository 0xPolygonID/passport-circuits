pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/poseidon.circom";

template LinkID() {
    signal input dg1Hash;
    signal input dg2Hash;
    signal input linkNonce;

    signal output out;

    signal isNonceZero <== IsZero()(linkNonce);

    signal linkID <== Poseidon(3)([dg1Hash, dg2Hash, linkNonce]);

    out <== Mux1()(
        [linkID, 0],
        isNonceZero
    );
}
