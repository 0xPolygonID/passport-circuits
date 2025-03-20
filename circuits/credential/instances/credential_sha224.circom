pragma circom 2.1.9;

include "../credential.circom";

component main { public [dg1, templateRoot, issuanceDate] } = DG1FieldParser(224, 10, 15);
