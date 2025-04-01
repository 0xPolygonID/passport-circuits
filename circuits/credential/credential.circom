pragma circom 2.1.9;

include "./constants.circom";

include "../utils/passport/parser/extractors.circom";
include "../utils/passport/date/dateDiffGreaterThanYear.circom";
include "../utils/crypto/bitify/bytes.circom";
include "../utils/crypto/hasher/hash.circom";
include "../utils/iden3/claimbuilder.circom";
include "../utils/iden3/bytes.circom";
include "../utils/iden3/linkId.circom";
include "../utils/iden3/poseidon.circom";

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
template DG1FieldParser(hashAlgo, hashSize, nLevels, smtChanges) {
    signal input dg1[DG1_TD3_SIZE()];
    signal input dg2Hash[hashSize]; // size([]bytes(hex)) we need we need to pass bytes as they are
    signal input lastNameSize;
    signal input firstNameSize;
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
    signal output linkId;

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

    component dg2HashHasher = PaddingAndPoseidon(hashSize);
    dg2HashHasher.in <== dg2Hash;
    signal poseidonDg2Hash <== dg2HashHasher.hash;

    // TODO (illia-korotia): move to separate circuit:
    var keysToUpdate[smtChanges] = [
        4817156672888655522763064392525239094511187154831557262772815264540847425378, // credentialSubject.dateOfBirth
        2661316897620170050641842010022238582485958559445913964628121513401804945508, // credentialSubject.documentExpirationDate
        17812501853592608022106438142029031484125620705472224666715824544873239913147, // credentialSubject.firstName
        643493878926457766162531104335565260785288743937125657511062755781004518297, // credentialSubject.fullName
        5768075745493428917651844471684022554030750947591103713762344570867180513614, // credentialSubject.governmentIdentifier
        12037662945351652395520680282306597407040165994104304811455681806232413956620, // credentialSubject.governmentIdentifierType
        16829829523990922339853122033176330960757159233571217495904710638791793740933, // credentialSubject.sex
        18652354674254268839450839640508993614932212252620036777561285260846450401086, // credentialStatus.revocationNonce
        11896622783611378286548274235251973588039499084629981048616800443645803129554, // credentialStatus.id
        4792130079462681165428511201253235850015648352883240577315026477780493110675, // credentialSubject.id
        13483382060079230067188057675928039600565406666878111320562435194759310415773, // expirationDate.id
        8713837106709436881047310678745516714551061952618778897121563913918335939585, // issuanceDate.id
        5940025296598751562822259677636111513267244048295724788691376971035167813215, // issuer.id
        12721581730399791084220775389224758160887300573168177512619749567794685336757, // credentialSubject.nationalities
        8420111610095993874869544651671831438228943062702729758375308097770323355054, // credentialSubject.nationalities
        5174935119518540357656305431208837480424139947723235187406958318762813271623 // credentialSubject.customFields
    ];

    // issuanceDate and documentDOETimestamp are in UnixTimestamp format
    signal credentialExpiration <== DateDiffGreaterThanYear()(issuanceDate, documentDOETimestamp);

    /*
    // For debuging mt update
    log(documentDOB);
    log(documentDOE); // expiration date in format YYYYMMDD == passport mrz
    log(documentFirstNameHash);
    log(documentLastNameHash);
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
    log(poseidonDg2Hash);
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
        credentialExpiration * 1000000000, // expirationDate.id
        issuanceDate * 1000000000, // issuanceDate.id
        issuer, // issuer.id
        documentNationalityHash, // credentialSubject.nationalities
        documentIssuerHash, // credentialSubject.nationalities
        poseidonDg2Hash // credentialSubject.customFields.string3
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
    linkId <== LinkID()(poseidonDg1Hash, poseidonDg2Hash, linkNonce);
}
