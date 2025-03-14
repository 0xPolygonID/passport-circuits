pragma circom 2.1.9;

include "../signature.circom";

component main { public [ merkle_root ] } = SIGNATURE(160, 256, 1, 120, 35, 384, 128);