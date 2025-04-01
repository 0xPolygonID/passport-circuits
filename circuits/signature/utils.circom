pragma circom 2.1.9;
include "../utils/passport/constants.circom";

template DgHashToHex(DG_HASH_ALGO_BYTES) {
    signal input dg2_hash_bytes[DG_HASH_ALGO_BYTES];
    signal output hex_bytes[DG_HASH_ALGO_BYTES * 2];

    for (var i = 0; i < DG_HASH_ALGO_BYTES; i++) {
        hex_bytes[i * 2] <-- dg2_hash_bytes[i] \ 16;
        hex_bytes[i * 2 + 1] <-- dg2_hash_bytes[i] % 16;
    }
}

template PaddingAndPoseidon(fieldSize) {
    signal input in[fieldSize];
    signal output hash;

    component outInts = PackBytes2(messageMaxSize());
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

// PackBytes is already defined in @zk-kit, we need to calculate LinkID similar to the one in circuits/credential/credential.circom
template PackBytes2(maxBytes) {
    var packSize = MAX_BYTES_IN_FIELD();
    var maxInts = computeIntChunkLength(maxBytes);

    signal input in[maxBytes];
    signal output out[maxInts];

    signal intSums[maxInts][packSize];

    for (var i = 0; i < maxInts; i++) {
        for(var j=0; j < packSize; j++) {
            var idx = packSize * i + j;
            var bt = idx >= maxBytes ? 0 : in[idx];
            if (j == 0) {
                intSums[i][j] <== bt;
            } else {
                intSums[i][j] <== intSums[i][j-1] * 256 + bt;
            }
        }
    }

    // Last item of each chunk is the final sum
    for (var i = 0; i < maxInts; i++) {
        out[i] <== intSums[i][packSize-1];
    }
}
