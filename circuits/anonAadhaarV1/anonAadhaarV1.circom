pragma circom 2.1.9;


include "../utils/iden3/claimbuilder.circom";
include "../utils/iden3/constants.circom";
include "../utils/iden3/numbers.circom";
include "../utils/anonaadhaar/parser/extractor.circom";

include "anon-aadhaar/packages/circuits/src/helpers/signature.circom";
include "anon-aadhaar/packages/circuits/src/helpers/nullifier.circom";
include "circomlib/circuits/poseidon.circom";

/// @title AadhaarQRVerifier
/// @notice This circuit verifies the Aadhaar QR data using RSA signature
/// @param n RSA pubic key size per chunk
/// @param k Number of chunks the RSA public key is split into
/// @param maxDataLength Maximum length of the data
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndices Indices of delimiters (255) in the QR text data. 18 delimiters including photo
/// @input signature RSA signature
/// @input pubKey RSA public key (of the government)
/// @input nullifierSeed A random value used as an input to compute the nullifier; for example: applicationId, actionId
/// @input public signalHash Any message to commit to (to make it part of the proof)
/// @output pubkeyHash Poseidon hash of the RSA public key (after merging nearby chunks)
/// @output nullifier A unique value derived from nullifierSeed and Aadhaar data to nullify the proof/user
template AadhaarQRVerifier(n, k, maxDataLength, nLevels, smtChanges) {
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input signature[k];
    signal input pubKey[k];

    // Public inputs
    signal input nullifierSeed;
    signal input signalHash;
    signal input templateRoot;
    signal input issuer;

    // Iden3 credentials input
    signal input revocationNonce;
    signal input credentialStatusID;
    signal input credentialSubjectID;
    signal input userID;
    signal input expirationTime;

    // Iden3 merkle tree root inputs
    signal input siblings[smtChanges][nLevels];

    signal output pubkeyHash;
    signal output nullifier;
    signal output hashIndex;
    signal output hashValue;
    signal output issuanceDate;
    signal output expirationDate;
    signal output qrVersion;

    // keys to update
    var keysToUpdate[smtChanges] = [
        GetDateOfBirth(), // credentialSubject.dateOfBirth
        GetFullName(), // credentialSubject.fullName
        GetGender(), // credentialSubject.gender
        GetGovernmentIdentifier(), // credentialSubject.govermentIdentifier
        GetGovernmentIdentifierType(), // credentialSubject.governmentIdentifierType
        GetRevocationNonce(), // credentialStatus.revocationNonce
        GetAddressLine1(), // credentialSubject.addresses
        GetCredentialStatusID(), // credentialStatus.id
        GetCredentialSubjectID(), // credentialSubject.id
        GetExpirationDate(), // expirationDate.id
        GetIssuanceDate(), // issuanceDate.id
        GetIssuer(), // issuer.id,
        GetDocumentIssuer() // credentialSubject.nationalities.nationality2CountryCode
    ];

    // Assert `qrDataPaddedLength` fits in `ceil(log2(maxDataLength))`
    component n2bHeaderLength = Num2Bits(log2Ceil(maxDataLength));
    n2bHeaderLength.in <== qrDataPaddedLength;


    // Verify the RSA signature
    component signatureVerifier = SignatureVerifier(n, k, maxDataLength);
    signatureVerifier.qrDataPadded <== qrDataPadded;
    signatureVerifier.qrDataPaddedLength <== qrDataPaddedLength;
    signatureVerifier.pubKey <== pubKey;
    signatureVerifier.signature <== signature;
    pubkeyHash <== signatureVerifier.pubkeyHash;


    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);
    

    // Extract data from QR and compute nullifiers
    component qrDataExtractor = QRDataExtractor(maxDataLength);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;


    // use the time of signing as the date of issue
    issuanceDate <== qrDataExtractor.timestamp;
    expirationDate <== issuanceDate + expirationTime;

    // Check if the final expirationDate is compatible with the Unix timestamp(int size)
    component expirationFitsTo64Bits = CheckMaxBits(64);
    expirationFitsTo64Bits.inputInteger <== expirationDate;
    expirationFitsTo64Bits.isValid === 1;

    // extract qr version
    qrVersion <== qrDataExtractor.qrVersion;

    /* // For debugging
    log(qrDataExtractor.dob);
    log(qrDataExtractor.name);
    log(qrDataExtractor.gender);
    log(qrDataExtractor.referenceID);
    log("9625374645547036629006936456349235401907107363945660607867283679088689283602");
    log(revocationNonce);
    log(qrDataExtractor.address);
    log(credentialStatusID);
    log(credentialSubjectID);
    log(expirationDate * 1000000000);
    log(issuanceDate * 1000000000);
    log(issuer);
    log("18607257606080006340563297173112093370969227692083664718938277647469374823290"); // IND
    */

    /*
        expirationDate and issuanceDate represent the timestamp in seconds. 
        The Merkalization library works with timestamps in nanoseconds. 
        We need to multiply expirationDate and issuanceDate by 1,000,000,000 to get the timestamp in nanoseconds
    */
    // we need to keep the same sequence as update keys
    var valuesToUpdate[smtChanges] = [
        qrDataExtractor.dob, // birthday
        qrDataExtractor.name, // fullName
        qrDataExtractor.gender, // gender
        qrDataExtractor.referenceID, // govermentIdentifier
        9625374645547036629006936456349235401907107363945660607867283679088689283602, // governmentIdentifierType poseidon16("other")
        revocationNonce, // revocationNonce
        qrDataExtractor.address, // address
        credentialStatusID, // credentialStatus.id
        credentialSubjectID, // credentialSubject.id
        expirationDate * 1000000000, // expirationDate
        issuanceDate * 1000000000, // issuanceDate
        issuer, // issuer
        18607257606080006340563297173112093370969227692083664718938277647469374823290 // nationality2CountryCode poseidon16("IND")
    ];

    signal claimRoot;
    component c = ClaimRootBuilder(nLevels, smtChanges);
    c.templateRoot <== templateRoot;
    c.siblings <== siblings;
    c.keys <== keysToUpdate;
    c.values <== valuesToUpdate;
    claimRoot <== c.newRoot;

    // Calculate nullifier
    signal photo[photoPackSize()] <== qrDataExtractor.photo;
    nullifier <== Nullifier()(nullifierSeed, photo);

    
    // Dummy square to prevent signal tampering (in rare cases where non-constrained inputs are ignored)
    signal signalHashSquare <== signalHash * signalHash;

    // The value was calculated using the go-iden3-core library
    component hI = Poseidon(4);
    hI.inputs[0] <== V0WithBasicPersonSchemaV1_43();
    hI.inputs[1] <== userID;
    hI.inputs[2] <== claimRoot;
    hI.inputs[3] <== 0;

    component V0Calc = V0Calculator();
    V0Calc.revocation <== revocationNonce;
    V0Calc.expiration <== expirationDate;

    component hV = Poseidon(4);
    hV.inputs[0] <== V0Calc.out;
    hV.inputs[1] <== 0;
    hV.inputs[2] <== 0;
    hV.inputs[3] <== 0;

    hashIndex <== hI.out;
    hashValue <== hV.out;
}
