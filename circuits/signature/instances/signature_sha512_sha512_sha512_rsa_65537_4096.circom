pragma circom 2.1.9;

include "../signature.circom";

component main { public [ merkle_root ] } = SIGNATURE(512, 512, 15, 120, 35, 896, 256);
