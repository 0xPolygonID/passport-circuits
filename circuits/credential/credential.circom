pragma circom 2.1.9;

include "./constants.circom";

include "../utils/iden3/claimbuilder.circom";
include "../utils/iden3/linkId.circom";
include "../utils/iden3/poseidon.circom";
include "../utils/iden3/constants.circom";
include "../utils/iden3/numbers.circom";
include "../utils/passport/parser/extractors.circom";
include "../utils/passport/date/dateDiffGreaterThanYear.circom";

include "self/circuits/circuits/utils/crypto/bitify/bytes.circom";
include "self/circuits/circuits/utils/crypto/hasher/hash.circom";
include "circomlib/circuits/poseidon.circom";

template Integrity(hashAlgo) {
    signal input dg1[DG1_TD3_SIZE()];
    signal output poseidonDg1Hash;
    
    var hashAlgBytesSize = hashAlgo / 8;
    signal dg1Bits[DG1_TD3_SIZE_BITS()] <== BytesToBitsArray(DG1_TD3_SIZE())(dg1);
    signal dg1ShaBits[hashAlgo] <== ShaHashBits(DG1_TD3_SIZE_BITS(), hashAlgo)(dg1Bits);
    
    signal dg1ShaBytes[hashAlgBytesSize];
    dg1ShaBytes <== BitsToBytesArray(hashAlgo)(dg1ShaBits);
    poseidonDg1Hash <== PaddingAndPoseidon(hashAlgBytesSize)(dg1ShaBytes);
}

/*
    The template DG1FieldParser cuts fields as from DG1:
    1. Document code: Position 1, Size 2
    2. Issuing State or organization: Position 3, Size 3
    3. Name of holder: Position 6, Size 39
    4. Document number: Position 1, Size 9
    5. Nationality: Position 11, Size 3
    6. DOB: Position 14, Size 6
    7. Sex: Position 21, Size 1
    8. Date of expiry: Position 22, Size 6
*/
template DG1FieldParser(hashAlgo, nLevels, smtChanges) {
    signal input dg1[DG1_TD3_SIZE()];
    signal input holderNameSize;
    signal input currentDate; // Format: YYMMDD

    signal input revocationNonce;
    signal input credentialStatusID;
    signal input credentialSubjectID;
    signal input userID;
    signal input issuer;
    signal input issuanceDate;

    signal input linkNonce;
    signal input templateRoot;
    signal input siblings[smtChanges][nLevels];

    signal output hashIndex;
    signal output hashValue;
    signal output linkId;

    // check if currentDate exists between 0 and 1,048,575;
    // to prevent pass any value between p/2 and p-1 (negative)
    component currentDateFitsTo20Bits = CheckMaxBits(20);
    currentDateFitsTo20Bits.inputInteger <== currentDate;
    currentDateFitsTo20Bits.isValid === 1;

    component documentCodeExtractor = Extractor(DG1_TD3_SIZE(), documentCodePosition(), documentCodeSize());
    documentCodeExtractor.dg1 <== dg1;
    signal documentCodeHash <== documentCodeExtractor.hash;

    component documentIssuerExtractor = Extractor(DG1_TD3_SIZE(), issuingStatePosition(), issuingStateSize());
    documentIssuerExtractor.dg1 <== dg1;
    signal documentIssuerHash <== documentIssuerExtractor.hash;

    component holderNameExtractor = ExtractorHolder(DG1_TD3_SIZE(), nameOfHolderSize());
    holderNameExtractor.dg1 <== dg1;
    holderNameExtractor.start <== nameOfHolderPosition();
    holderNameExtractor.end <== holderNameSize;
    signal holderNameHash <== holderNameExtractor.hash;

    component documentNumberExtractor = Extractor(DG1_TD3_SIZE(), documentNumberPosition(), documentNumberSize());
    documentNumberExtractor.dg1 <== dg1;
    signal documentNumberHash <== documentNumberExtractor.hash;

    component documentNationalityExtractor = Extractor(DG1_TD3_SIZE(), nationalityPosition(), nationalitySize());
    documentNationalityExtractor.dg1 <== dg1;
    signal documentNationalityHash <== documentNationalityExtractor.hash;

    component documentDOBExtractor = ExtractorDOB(DG1_TD3_SIZE(), dobPosition(), dobSize());
    documentDOBExtractor.dg1 <== dg1;
    documentDOBExtractor.currentDate <== currentDate;
    signal documentDOB <== documentDOBExtractor.out;

    component documentSexExtractor = Extractor(DG1_TD3_SIZE(), sexPosition(), sexSize());
    documentSexExtractor.dg1 <== dg1;
    signal documentSexHash <== documentSexExtractor.hash;

    component documentDOEExtractor = ExtractorDOE(DG1_TD3_SIZE(), dateOfExpiryPosition(), dateOfExpirySize());
    documentDOEExtractor.dg1 <== dg1;
    documentDOEExtractor.currentDate <== currentDate;
    signal documentDOE <== documentDOEExtractor.out;
    signal documentDOETimestamp <== documentDOEExtractor.timestamp;

    var keysToUpdate[smtChanges] = [
        GetDateOfBirth(), // credentialSubject.dateOfBirth
        GetDocumentExpirationDate(), // credentialSubject.documentExpirationDate
        GetFullName(), // credentialSubject.fullName
        GetGovernmentIdentifier(), // credentialSubject.governmentIdentifier
        GetGovernmentIdentifierType(), // credentialSubject.governmentIdentifierType
        GetSex(), // credentialSubject.sex
        GetRevocationNonce(), // credentialStatus.revocationNonce
        GetCredentialStatusID(), // credentialStatus.id
        GetCredentialSubjectID(), // credentialSubject.id
        GetExpirationDate(), // expirationDate.id
        GetIssuanceDate(), // issuanceDate.id
        GetIssuer(), // issuer.id
        GetDocumentNationality(), // credentialSubject.nationalities
        GetDocumentIssuer() // credentialSubject.nationalities
    ];

    // issuanceDate and documentDOETimestamp are in UnixTimestamp format
    signal credentialExpiration <== DateDiffGreaterThanYear()(issuanceDate, documentDOETimestamp);

    /*
    // For debuging mt update
    log(documentDOB);
    log(documentDOE); // expiration date in format YYYYMMDD == passport mrz
    log(holderNameHash);
    log(documentNumberHash);
    log(documentCodeHash);
    log(documentSexHash);
    log(revocationNonce);
    log(credentialStatusID);
    log(credentialSubjectID);
    log(credentialExpiration * 1000000000);
    log(issuanceDate * 1000000000);
    log(issuer);
    log(documentNationalityHash);
    log(documentIssuerHash);
    */

    var valuesToUpdate[smtChanges] = [
        documentDOB, // credentialSubject.dateOfBirth
        documentDOE, // credentialSubject.documentExpirationDate
        holderNameHash, // credentialSubject.fullName
        documentNumberHash, // credentialSubject.govermentIdentifier
        documentCodeHash, // credentialSubject.governmentIdentifierType
        documentSexHash, // credentialSubject.sex
        revocationNonce, // credentialStatus.revocationNonce
        credentialStatusID, // credentialStatus.id
        credentialSubjectID, // credentialSubject.id
        credentialExpiration * 1000000000, // expirationDate.id
        issuanceDate * 1000000000, // issuanceDate.id
        issuer, // issuer.id
        documentNationalityHash, // credentialSubject.nationalities
        documentIssuerHash // credentialSubject.nationalities
    ];

    component c = ClaimRootBuilder(nLevels, smtChanges);
    c.templateRoot <== templateRoot;
    c.siblings <== siblings;
    c.keys <== keysToUpdate;
    c.values <== valuesToUpdate;

    // For debuging mt root
    // log(c.newRoot);

    // The value was calculated using the go-iden3-core library
    var i0 = v0();
    component hI = Poseidon(4);
    hI.inputs[0] <== i0;
    hI.inputs[1] <== userID;
    hI.inputs[2] <== c.newRoot;
    hI.inputs[3] <== 0;

    component V0Calc = V0Calculator();
    V0Calc.revocation <== revocationNonce;
    V0Calc.expiration <== credentialExpiration;

    component hV = Poseidon(4);
    hV.inputs[0] <== V0Calc.out;
    hV.inputs[1] <== 0;
    hV.inputs[2] <== 0;
    hV.inputs[3] <== 0;

    hashIndex <== hI.out;
    hashValue <== hV.out;

    signal poseidonDg1Hash <== Integrity(hashAlgo)(dg1);
    linkId <== LinkID()(poseidonDg1Hash, linkNonce);
}
