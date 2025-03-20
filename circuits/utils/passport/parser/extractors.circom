pragma circom 2.1.9;

include "./timestamp.circom";

include "../../iden3/bytes.circom";
include "../../iden3/poseidon.circom";

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";

template Extractor(dg1Size, shift, fieldSize) {
    signal input dg1[dg1Size];
    signal output hash;

    signal field[fieldSize];
    component eq[fieldSize];
    // TODO (illia-korotia): we can rewrite this for to separate template
    // and pass from symbol to symbol
    for (var i = 0; i < fieldSize; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== dg1[shift + i];
        eq[i].in[1] <== dg1DelimiterSymbol();
        field[i] <== (1 - eq[i].out) * dg1[shift + i];
    }

    component pap = PaddingAndPoseidon(fieldSize);
    pap.in <== field;
    hash <== pap.hash;
}

template ExtractorHolder(dg1Size, nameOfHolderSize) {
    signal input dg1[dg1Size];
    signal input start;
    signal input end;

    signal output hash;
    
    component selector = SelectSubArray(dg1Size, nameOfHolderSize);
    selector.in <== dg1;
    selector.startIndex <== start;
    selector.length <== end;
    signal subArray[nameOfHolderSize] <== selector.out;

    signal normalizedHolder[nameOfHolderSize];
    component eq[nameOfHolderSize];
    for (var i = 0; i < nameOfHolderSize; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== subArray[i];
        eq[i].in[1] <== dg1DelimiterSymbol();
        
        // Calculate output: if character is '<', replace with space, otherwise keep the character
        normalizedHolder[i] <== spaceSymbol() * eq[i].out + subArray[i] * (1 - eq[i].out);
    }

   component pap = PaddingAndPoseidon(nameOfHolderSize);
   pap.in <== normalizedHolder;
   hash <== pap.hash;
}

template ExtractorDOB(dg1Size, shift, fieldSize) {
    signal input dg1[dg1Size];
    signal input currentDate;
    
    signal output out;

    signal field[fieldSize];
    component eq[fieldSize];
    // TODO (illia-korotia): we can rewrite this for to separate template
    // and pass from symbol to symbol
    for (var i = 0; i < fieldSize; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== dg1[shift + i];
        eq[i].in[1] <== dg1DelimiterSymbol();
        field[i] <== (1 - eq[i].out) * dg1[shift + i];
    }

    component dateInt = DigitBytesToInt(fieldSize);
    dateInt.in <== field;

    component converter = DateFormatConverter();
    converter.date <== dateInt.out;
    converter.currentDate <== currentDate;

    // we don't use poseidon for ints
    out <== converter.formattedDate;
}

template ExtractorDOE(dg1Size, shift, fieldSize) {
    signal input dg1[dg1Size];    
    signal input currentDate;

    signal output out;
    signal output timestamp;

    signal field[fieldSize];
    component eq[fieldSize];
    // TODO (illia-korotia): we can rewrite this for to separate template
    // and pass from symbol to symbol
    for (var i = 0; i < fieldSize; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== dg1[shift + i];
        eq[i].in[1] <== dg1DelimiterSymbol();
        field[i] <== (1 - eq[i].out) * dg1[shift + i];
    }

    component dateInt = DigitBytesToInt(fieldSize);
    dateInt.in <== field;

    signal lt <== LessEqThan(64)([currentDate, dateInt.out]);
    lt === 1;

    out <== 20000000 + dateInt.out;

    signal output year <== DigitBytesToInt(2)([field[0], field[1]]);
    signal output month <== DigitBytesToInt(2)([field[2], field[3]]);
    signal output day <== DigitBytesToInt(2)([field[4], field[5]]);

    component dateToUnixTime = DigitBytesToTimestamp(2100);
    dateToUnixTime.year <== 2000 + year;
    dateToUnixTime.month <== month;
    dateToUnixTime.day <== day;
    dateToUnixTime.hour <== 0;
    dateToUnixTime.minute <== 0;
    dateToUnixTime.second <== 0;

    timestamp <== dateToUnixTime.out;
}