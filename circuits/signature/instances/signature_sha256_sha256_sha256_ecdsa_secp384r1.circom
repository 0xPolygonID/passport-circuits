pragma circom 2.1.9;

include "../signature.circom";

component main { public [ merkle_root ] } = SIGNATURE(256, 256, 23, 64, 6, 512, 128);