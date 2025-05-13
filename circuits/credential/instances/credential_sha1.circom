pragma circom 2.1.9;

include "../credential.circom";

component main { public [currentDate, issuanceDate, templateRoot, issuer, revocationNonce] } = DG1FieldParser(160, 8, 14);
