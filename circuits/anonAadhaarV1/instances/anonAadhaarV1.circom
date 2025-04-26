pragma circom 2.1.9;

include "../anonAadhaarV1.circom";

component main { public [nullifierSeed, signalHash, templateRoot, issuer] } = AadhaarQRVerifier(121, 17, 512 * 3, 9, 13);
