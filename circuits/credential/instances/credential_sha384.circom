pragma circom 2.1.9;

include "../credential.circom";

component main { public [currentDate, issuanceDate, templateRoot, issuer, revocationNonce] } = DG1FieldParser(384, 8, 14);
