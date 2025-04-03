pragma circom 2.1.9;

include "../credential.circom";

component main { public [currentDate, issuanceDate, templateRoot] } = DG1FieldParser(256, 13, 15);
