pragma circom 2.1.9;

include "../idcard.circom";

component main { public [currentDate, issuanceDate, templateRoot, issuer, revocationNonce] } = DG1FieldParser(512, 8, 14);
