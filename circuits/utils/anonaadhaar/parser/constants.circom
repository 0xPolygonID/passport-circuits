pragma circom 2.1.9;

function referenceIDPosition() {
  return 2;
}

// Position/order (not index) of name field in the data
// i.e, name bytes will appear after 3rd 255
function namePosition() {
  return 3;
}

function dobPosition() {
  return 4;
}

function genderPosition() {
  return 5;
}

function districtPosition() {
  return 7;
}

function housePosition() {
  return 9;
}

function pinCodePosition() {
  return 11;
}

function statePosition() {
  return 13;
}

function streetPosition() {
  return 14;
}

function VTCPosition() {
  return 16;
}

function photoPosition() {
  return 18;
}

// Number of int chunks to pack the photo to
// Photo can only be of max 32  * 31 bytes (packSize * fieldByteSize)
function photoPackSize() {
  return 32;
}

function stringValuePackSize() {
  return 16;
}
