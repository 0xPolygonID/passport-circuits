import {
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
  max_dsc_bytes,
  max_csca_bytes,
  COMMITMENT_TREE_DEPTH,
} from '../constants/constants';
import { PassportData } from '../types';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { getCountryLeaf, getNameDobLeaf, getPassportNumberAndNationalityLeaf, getLeafCscaTree, getLeafDscTree, getNameYobLeaf } from '../trees';
import { getCscaTreeInclusionProof, getDscTreeInclusionProof } from '../trees';
import { SMT } from '@openpassport/zk-kit-smt';
import {
  extractSignatureFromDSC,
  findStartPubKeyIndex,
  formatSignatureDSCCircuit,
  generateCommitment,
  getCertificatePubKey,
  getPassportSignatureInfos,
  pad,
  padWithZeroes,
} from '../passports/passport';
import { hash, packBytesAndPoseidon } from '../hash';
import { formatMrz } from '../passports/format';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple';
import { parseDscCertificateData } from '../passports/passport_parsing/parseDscCertificateData';

export function generateCircuitInputsDSC(
  dscCertificate: string,
  serializedCscaTree: string[][],
) {
  const dscParsed = parseCertificateSimple(dscCertificate);
  const dscMetadata = parseDscCertificateData(dscParsed);
  const cscaParsed = parseCertificateSimple(dscMetadata.csca);

  // CSCA is padded with 0s to max_csca_bytes
  const cscaTbsBytesPadded = padWithZeroes(cscaParsed.tbsBytes, max_csca_bytes);
  const dscTbsBytes = dscParsed.tbsBytes;

  // DSC is padded using sha padding because it will be hashed in the circuit
  const [dscTbsBytesPadded, dscTbsBytesLen] = pad(dscMetadata.cscaHashAlgorithm)(
    dscTbsBytes,
    max_dsc_bytes
  );

  const leaf = getLeafCscaTree(cscaParsed);
  const [root, path, siblings] = getCscaTreeInclusionProof(leaf, serializedCscaTree);

  // Parse CSCA certificate and get its public key
  const csca_pubKey_formatted = getCertificatePubKey(
    cscaParsed,
    dscMetadata.cscaSignatureAlgorithm,
    dscMetadata.cscaHashAlgorithm
  );

  const signatureRaw = extractSignatureFromDSC(dscCertificate);
  const signature = formatSignatureDSCCircuit(
    dscMetadata.cscaSignatureAlgorithm,
    dscMetadata.cscaHashAlgorithm,
    cscaParsed,
    signatureRaw
  );

  // Get start index of CSCA pubkey based on algorithm
  const [startIndex, keyLength] = findStartPubKeyIndex(cscaParsed, cscaTbsBytesPadded, dscMetadata.cscaSignatureAlgorithm);


  return {
    raw_csca: cscaTbsBytesPadded.map(x => x.toString()),
    raw_csca_actual_length: BigInt(cscaParsed.tbsBytes.length).toString(),
    csca_pubKey_offset: startIndex.toString(),
    csca_pubKey_actual_size: BigInt(keyLength).toString(),
    raw_dsc: Array.from(dscTbsBytesPadded).map(x => x.toString()),
    raw_dsc_padded_length: BigInt(dscTbsBytesLen).toString(), // with the sha padding actually
    csca_pubKey: csca_pubKey_formatted,
    signature,
    merkle_root: root,
    path: path,
    siblings: siblings,
  };
}

export function generateCircuitInputsSignature(
  secret: string,
  passportData: PassportData,
  serializedDscTree: string,
) {
  const { mrz, eContent, signedAttr } = passportData;
  const passportMetadata = passportData.passportMetadata;
  const dscParsed = passportData.dsc_parsed;

  const [dscTbsBytesPadded,] = pad(dscParsed.hashAlgorithm)(
    dscParsed.tbsBytes,
    max_dsc_bytes
  );

  const { pubKey, signature, signatureAlgorithmFullName } = getPassportSignatureInfos(passportData);
  const mrz_formatted = formatMrz(mrz);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = pad(passportMetadata.eContentHashFunction)(
    eContent,
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]
  );
  const [signedAttrPadded, signedAttrPaddedLen] = pad(passportMetadata.signedAttrHashFunction)(
    signedAttr,
    MAX_PADDED_SIGNED_ATTR_LEN[passportMetadata.eContentHashFunction]
  );

  const dsc_leaf = getLeafDscTree(dscParsed, passportData.csca_parsed); // TODO: WRONG 
  const [root, path, siblings, leaf_depth] = getDscTreeInclusionProof(dsc_leaf, serializedDscTree);
  const csca_tree_leaf = getLeafCscaTree(passportData.csca_parsed);

  // Get start index of DSC pubkey based on algorithm
  const [startIndex, keyLength] = findStartPubKeyIndex(dscParsed, dscTbsBytesPadded, dscParsed.signatureAlgorithm);

  const inputs = {
    raw_dsc: dscTbsBytesPadded.map(x => x.toString()),
    raw_dsc_actual_length: [BigInt(dscParsed.tbsBytes.length).toString()],
    dsc_pubKey_offset: startIndex,
    dsc_pubKey_actual_size: [BigInt(keyLength).toString()],
    dg1_packed_hash: packBytesAndPoseidon(mrz_formatted),
    // dg1: mrz_formatted,
    // dg1_hash_offset: passportMetadata.dg1HashOffset,
    eContent: eContentPadded,
    eContent_padded_length: eContentLen,
    signed_attr: signedAttrPadded,
    signed_attr_padded_length: signedAttrPaddedLen,
    signed_attr_econtent_hash_offset: passportMetadata.eContentHashOffset,
    pubKey_dsc: pubKey,
    signature_passport: signature,
    merkle_root: [BigInt(root).toString()],
    leaf_depth: leaf_depth,
    path: path,
    siblings: siblings,
    csca_tree_leaf: csca_tree_leaf,
    secret: secret,
    linkNonce: 1,
  };

  return Object.entries(inputs)
    .map(([key, value]) => ({
      [key]: formatInput(value),
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}


export function formatInput(input: any) {
  if (Array.isArray(input)) {
    return input.map((item) => BigInt(item).toString());
  } else if (input instanceof Uint8Array) {
    return Array.from(input).map((num) => BigInt(num).toString());
  } else if (typeof input === 'string' && input.includes(',')) {
    const numbers = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '' && !isNaN(Number(s)))
      .map(Number);

    try {
      return numbers.map((num) => BigInt(num).toString());
    } catch (e) {
      throw e;
    }
  } else {
    return [BigInt(input).toString()];
  }
}