pragma circom 2.1.9;

include "../credential.circom";

component main { public [currentDate, issuanceDate, templateRoot, issuer] } = DG1FieldParser(512, 8, 14);
