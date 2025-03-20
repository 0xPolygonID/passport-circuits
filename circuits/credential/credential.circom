pragma circom 2.1.9;

include "./constants.circom";

include "../utils/passport/parser/extractors.circom";
include "../utils/crypto/bitify/bytes.circom";
include "../utils/crypto/hasher/hash.circom";
include "../utils/iden3/claimbuilder.circom";

template Integrity(hashAlgo) {
    signal input dg1[DG1_TD3_SIZE()];
    signal output dg1ShaBytes[hashAlgo / 8];
    
    var hashAlgBytesSize = hashAlgo / 8;
    signal dg1Bits[DG1_TD3_SIZE_BITS()] <== BytesToBitsArray(DG1_TD3_SIZE())(dg1);
    signal dg1ShaBits[hashAlgo] <== ShaHashBits(DG1_TD3_SIZE_BITS(), hashAlgo)(dg1Bits);
    dg1ShaBytes <== BitsToBytesArray(hashAlgo)(dg1ShaBits);
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
    signal input lastNameSize;
    signal input firstNameSize;
    signal input currentDate; // TODO (illia-korotia): Is field should be public input? Format: YYMMDD

    signal input revocationNonce;
    signal input credentialStatusID;
    signal input credentialSubjectID;
    signal input userID;
    signal input issuer;
    signal input issuanceDate;

    signal input templateRoot;
    signal input siblings[smtChanges][nLevels];

    signal output documentCodeHash;
    signal output documentIssuerHash;
    signal output documentLastNameHash;
    signal output documentFirstNameHash;
    signal output documentNumberHash;
    signal output documentNationalityHash;
    signal output documentDOB;
    signal output documentSexHash;
    signal output documentDOE;
    signal output hashIndex;
    signal output hashValue;
    signal output dg1Hash[hashAlgo / 8];

    component documentCodeExtractor = Extractor(DG1_TD3_SIZE(), documentCodePosition(), documentCodeSize());
    documentCodeExtractor.dg1 <== dg1;
    documentCodeHash <== documentCodeExtractor.hash;

    component documentIssuerExtractor = Extractor(DG1_TD3_SIZE(), issuingStatePosition(), issuingStateSize());
    documentIssuerExtractor.dg1 <== dg1;
    documentIssuerHash <== documentIssuerExtractor.hash;

    component lastNameExtractor = ExtractorHolder(DG1_TD3_SIZE(), nameOfHolderSize());
    lastNameExtractor.dg1 <== dg1;
    lastNameExtractor.start <== nameOfHolderPosition();
    lastNameExtractor.end <== lastNameSize;
    documentLastNameHash <== lastNameExtractor.hash;

    component firstNameExtractor = ExtractorHolder(DG1_TD3_SIZE(), nameOfHolderSize());
    firstNameExtractor.dg1 <== dg1;
    firstNameExtractor.start <== nameOfHolderPosition() + lastNameSize + 2;
    firstNameExtractor.end <== firstNameSize;
    documentFirstNameHash <== firstNameExtractor.hash;

    component documentNumberExtractor = Extractor(DG1_TD3_SIZE(), documentNumberPosition(), documentNumberSize());
    documentNumberExtractor.dg1 <== dg1;
    documentNumberHash <== documentNumberExtractor.hash;

    component documentNationalityExtractor = Extractor(DG1_TD3_SIZE(), nationalityPosition(), nationalitySize());
    documentNationalityExtractor.dg1 <== dg1;
    documentNationalityHash <== documentNationalityExtractor.hash;

    component documentDOBExtractor = ExtractorDOB(DG1_TD3_SIZE(), dobPosition(), dobSize());
    documentDOBExtractor.dg1 <== dg1;
    documentDOBExtractor.currentDate <== currentDate;
    documentDOB <== documentDOBExtractor.out;

    component documentSexExtractor = Extractor(DG1_TD3_SIZE(), sexPosition(), sexSize());
    documentSexExtractor.dg1 <== dg1;
    documentSexHash <== documentSexExtractor.hash;

    component documentDOEExtractor = ExtractorDOE(DG1_TD3_SIZE(), dateOfExpiryPosition(), dateOfExpirySize());
    documentDOEExtractor.dg1 <== dg1;
    documentDOEExtractor.currentDate <== currentDate;
    documentDOE <== documentDOEExtractor.out;
    signal documentDOETimestamp <== documentDOEExtractor.timestamp;


    // TODO (illia-korotia): move to separate circuit:
    var keysToUpdate[smtChanges] = [
        11718818292802126417463134214212976082628052906423225153106612749610200183413, // credentialSubject.dateOfBirth
        17067102995727523284306589033691644246394899863627321097385336370172459010471, // credentialSubject.documentExpirationDate
        396948171793807448670779079530437970230319997763427297159364741404168161086, // credentialSubject.firstName
        1540185022550171417964535586735569210235830901649938832989137234790618138161, // credentialSubject.fullName
        11665818515976908772146086926627988937767272157525043131077389782866401822622, // credentialSubject.govermentIdentifier
        20378936560477526294120993552723258097975107008215368308010022877877877266947, // credentialSubject.governmentIdentifierType
        10966443938224095219566683003147654763133050970169721700346734909387575337367, // credentialSubject.sex
        1763085948543522232029667616550496120517967703023484347613954302553484294902, // credentialStatus.revocationNonce
        11896622783611378286548274235251973588039499084629981048616800443645803129554, // credentialStatus.id
        4792130079462681165428511201253235850015648352883240577315026477780493110675, // credentialSubject.id
        13483382060079230067188057675928039600565406666878111320562435194759310415773, // expirationDate.id
        8713837106709436881047310678745516714551061952618778897121563913918335939585, // issuanceDate.id
        5940025296598751562822259677636111513267244048295724788691376971035167813215, // issuer.id
        9656117739891539357123771284552289598577388060024608839018723118201732735699, // credentialSubject.nationalities
        15699466668150257351625206938060640380549592812731019574696943258403707765146 // credentialSubject.nationalities
    ];

    /*
    // For debuging mt update
    log(documentDOB);
    log(documentDOE);
    log(documentFirstNameHash);
    log(documentLastNameHash);
    log(documentNumberHash);
    log(documentCodeHash);
    log(documentSexHash);
    log(revocationNonce);
    log(credentialStatusID);
    log(credentialSubjectID);
    log(documentDOETimestamp * 1000000000);
    log(issuanceDate * 1000000000);
    log(issuer);
    log(documentNationalityHash);
    log(documentIssuerHash);
    */

    var valuesToUpdate[smtChanges] = [
        documentDOB, // credentialSubject.dateOfBirth
        documentDOE, // credentialSubject.documentExpirationDate
        documentFirstNameHash, // credentialSubject.firstName
        documentLastNameHash, // credentialSubject.fullName
        documentNumberHash, // credentialSubject.govermentIdentifier
        documentCodeHash, // credentialSubject.governmentIdentifierType
        documentSexHash, // credentialSubject.sex
        revocationNonce, // credentialStatus.revocationNonce
        credentialStatusID, // credentialStatus.id
        credentialSubjectID, // credentialSubject.id
        documentDOETimestamp * 1000000000, // expirationDate.id
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
    V0Calc.expiration <== documentDOETimestamp;

    component hV = Poseidon(4);
    hV.inputs[0] <== V0Calc.out;
    hV.inputs[1] <== 0;
    hV.inputs[2] <== 0;
    hV.inputs[3] <== 0;

    hashIndex <== hI.out;
    hashValue <== hV.out;

    // To check integrity of dg1
    dg1Hash <== Integrity(hashAlgo)(dg1);
}
