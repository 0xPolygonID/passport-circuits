pragma circom 2.1.9;

include "../signature.circom";

component main { public [ merkle_root ] } = SIGNATURE(256, 224, 44, 32, 7, 512, 128);