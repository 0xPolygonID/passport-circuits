pragma circom 2.1.9;

include "./bytes.circom";

include "circomlib/circuits/poseidon.circom";
 
template PaddingAndPoseidon(fieldSize) {
    signal input in[fieldSize];
    signal output hash;

    component outInts = PackBytes(messageMaxSize());
    for (var i = 0; i < fieldSize; i ++) {
        outInts.in[i] <== in[i];
    }
    // padding
    for (var i = fieldSize; i < messageMaxSize(); i++) {
        outInts.in[i] <== 0;
    }
    
    component poseidon = Poseidon(chunkCount());
    poseidon.inputs <== outInts.out;
    hash <== poseidon.out;
}
