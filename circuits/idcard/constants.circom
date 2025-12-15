pragma circom 2.1.9;

// dg1TagSize size of tag before dg1 content
function dg1TagSize() {
  return 5;
}

// Document code: Line 1, Position 1, Size 2 (0-indexed: 0)
function documentCodePosition() {
  return 0 + dg1TagSize();
}
function documentCodeSize() {
  return 2;
}

// Issuing State or organization: Line 1, Position 3, Size 3 (0-indexed: 2)
function issuingStatePosition() {
  return 2 + dg1TagSize();
}
function issuingStateSize() {
  return 3;
}

// Document number: Line 1, Position 6, Size 9 (0-indexed: 5)
function documentNumberPosition() {
  return 5 + dg1TagSize();
}
function documentNumberSize() {
  return 9;
}

// DOB: Line 2, Position 1, Size 6 (0-indexed: 30 in concatenated)
function dobPosition() {
  return 30 + dg1TagSize();
}
function dobSize() {
  return 6;
}

// Sex: Line 2, Position 8, Size 1 (0-indexed: 37 in concatenated)
function sexPosition() {
  return 37 + dg1TagSize();
}
function sexSize() {
  return 1;
}

// Date of expiry: Line 2, Position 9, Size 6 (0-indexed: 38 in concatenated)
function dateOfExpiryPosition() {
  return 38 + dg1TagSize();
}
function dateOfExpirySize() {
  return 6;
}

// Nationality: Line 2, Position 16, Size 3 (0-indexed: 45 in concatenated)
function nationalityPosition() {
  return 45 + dg1TagSize();
}
function nationalitySize() {
  return 3;
}

// Name of holder: Line 3, Size 30 (0-indexed: 60 in concatenated)
function nameOfHolderPosition() {
  return 60 + dg1TagSize();
}
function nameOfHolderSize() {
  return 30; // Holder size for TD1
}

function getMaxDSCLength(){
    return 1792;
}

// Symbol '<' in ASCII encoding
function dg1DelimiterSymbol() {
    return 60; // <
}

// Symbol ' ' (space) in ASCII encoding
function spaceSymbol() {
    return 32;
}

// Size of DG1 (with tag) - TD1 has 90 characters + 5 tag bytes
function DG1_TD1_SIZE() {
    return 95;
}

// Max chunks bytes for Poseidon chunk
function chunkSize() {
    return 31;
}

// Max Poseidon chunks
function chunkCount() {
    return 16;
}

// Max Poseidon message size
function messageMaxSize() {
    return chunkSize() * chunkCount();
}

// Part of hashIndex. V0
function v0() {
  return 14586288774771787882356214884390414373502;
}

function DG1_TD1_SIZE_BITS() {
  return DG1_TD1_SIZE() * 8;
}