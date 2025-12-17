import * as forge from 'node-forge';
import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import { getHashLen, hash } from '../hash';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple';
import {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure';
import { getCurveForElliptic } from '../certificate_parsing/curves';
import * as mockCertificates from '../constants/mockCertificates';
import { countryCodes } from '../constants/constants';
import { generateSignedAttr } from './format';
import { byteToHexNibbles, initPassportDataParsing } from './passport';
import { formatAndConcatenateDataHashes } from './format';
import { PassportData } from '../types';

type ForgeHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512';

export function sign(
  privateKeyPem: string,
  dsc: string,
  hashAlgorithm: string,
  eContent: number[]
): number[] {
  const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);

  if (signatureAlgorithm === 'rsapss') {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm as ForgeHashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const pss = forge.pss.create({
      md: forge.md[hashAlgorithm as ForgeHashAlgorithm].create(),
      mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm as ForgeHashAlgorithm].create()),
      saltLength: parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
    });
    const signatureBytes = privateKey.sign(md, pss);
    return Array.from(signatureBytes, (c: string) => c.charCodeAt(0));
  } else if (signatureAlgorithm === 'ecdsa') {
    const curve = (publicKeyDetails as PublicKeyDetailsECDSA).curve;
    let curveForElliptic = getCurveForElliptic(curve);
    const ec = new elliptic.ec(curveForElliptic);

    const privateKeyDer = Buffer.from(
      privateKeyPem.replace(/-----BEGIN EC PRIVATE KEY-----|\n|-----END EC PRIVATE KEY-----/g, ''),
      'base64'
    );
    const asn1Data = asn1.fromBER(privateKeyDer);
    const privateKeyBuffer = (
      asn1Data.result.valueBlock as unknown as {
        value: Array<{ valueBlock: { valueHexView: Uint8Array } }>;
      }
    ).value[1].valueBlock.valueHexView;

    const keyPair = ec.keyFromPrivate(privateKeyBuffer);
    const msgHash = hash(hashAlgorithm, eContent, 'hex');

    const signature = keyPair.sign(msgHash, 'hex');
    const signatureBytes = Array.from(signature.toDER());

    return signatureBytes;
  } else {
    const privKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm as ForgeHashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const forgeSignature = privKey.sign(md);
    return Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
  }
}

export function getPkCertPair(signatureType: string): { privateKeyPem: string; dsc: string } {
  let privateKeyPem: string;
  let dsc: string;

  switch (signatureType) {
    case 'rsa_sha1_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha1_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha1_rsa_65537_2048;
      break;
    case 'rsa_sha1_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha1_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha1_rsa_65537_4096;
      break;
    case 'rsa_sha256_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_2048;
      break;
    case 'rsapss_sha256_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048;
      break;
    case 'rsapss_sha256_3_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_3_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_3_2048;
      break;
    case 'rsapss_sha256_3_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_3_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_3_3072;
      break;
    case 'rsapss_sha384_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsapss_48_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha384_rsapss_48_65537_3072;
      break;
    case 'rsapss_sha384_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsapss_48_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha384_rsapss_48_65537_2048;
      break;
    case 'ecdsa_sha256_secp256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_secp256r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_secp256r1;
      break;
    case 'ecdsa_sha1_secp256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_secp256r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_secp256r1;
      break;
    case 'ecdsa_sha384_secp384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_secp384r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_secp384r1;
      break;
    case 'ecdsa_sha256_secp384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_secp384r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_secp384r1;
      break;
    case 'ecdsa_sha1_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha256_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha384_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha512_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP256r1;
      break;
    case 'rsa_sha256_3_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_3_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_3_2048;
      break;
    case 'rsa_sha256_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_3072;
      break;
    case 'rsapss_sha256_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_3072;
      break;
    case 'rsapss_sha256_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096;
      break;
    case 'ecdsa_sha256_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha384_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha512_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha1_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha224_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha224_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha224_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha256_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha384_brainpoolP512r1_512':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP512r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP512r1;
      break;
    case 'ecdsa_sha512_brainpoolP512r1_512':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP512r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP512r1;
      break;
    case 'rsa_sha256_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_4096;
      break;
    case 'rsa_sha512_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha512_rsa_65537_4096;
      break;
    case 'rsa_sha512_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha512_rsa_65537_2048;
      break;
    case 'rsa_sha256_3_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_3_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_3_4096;
      break;
    case 'rsa_sha384_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha384_rsa_65537_4096;
      break;
    case 'rsapss_sha512_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsapss_64_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha512_rsapss_64_65537_4096;
      break;
    case 'rsapss_sha512_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsapss_64_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha512_rsapss_64_65537_2048;
      break;
    case 'ecdsa_sha224_secp224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha224_ecdsa_secp224r1_key;
      dsc = mockCertificates.mock_dsc_sha224_ecdsa_secp224r1;
      break;
    default:
      throw new Error(`Unsupported signature type: ${signatureType}`);
  }

  return { privateKeyPem: privateKeyPem, dsc };
}

export function buildTD1(
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  sex: string = 'M',
  documentNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT'
) {
  if (birthDate.length !== 6 || expiryDate.length !== 6) {
    throw new Error('birthdate and expiry date have to be in the "YYMMDD" format');
  }

  // Prepare last name and first name
  const lastNameParts = lastName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedLastName = lastNameParts.join('<');

  const firstNameParts = firstName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedFirstName = firstNameParts.join('<');

  // Line 1: Document code (2) + Issuing state (3) + Document number (9) + Check digit (1) + Optional data (15)
  let line1 = `ID${nationality}${documentNumber.padEnd(9, '<')}1`;
  line1 = line1.padEnd(30, '<'); // Pad with '<' to reach 30 chars

  // Line 2: DOB (6) + Check (1) + Sex (1) + Expiry (6) + Check (1) + Nationality (3) + Optional (11) + Check (1)
  let line2 = `${birthDate}1${sex}${expiryDate}1${nationality}`;
  line2 = line2.padEnd(29, '<'); // Pad optional data
  line2 = line2 + '1';

  // Line 3: Name of holder (30)
  let line3 = `${formattedLastName}<<${formattedFirstName}`;
  line3 = line3.padEnd(30, '<');

  if (line3.length > 30) {
    // Truncate if name is too long
    line3 = line3.substring(0, 30);
  }

  const mrz = line1 + line2 + line3;

  if (mrz.length !== 90) {
    throw new Error(`TD1 MRZ must be 90 characters long, got ${mrz.length}`);
  }

  return mrz;
}

export function buildTD3(
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT'
): string {
  if (birthDate.length !== 6 || expiryDate.length !== 6) {
    throw new Error('birthdate and expiry date have to be in the "YYMMDD" format');
  }

  // Prepare last name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const lastNameParts = lastName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedLastName = lastNameParts.join('<');

  // Prepare first name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const firstNameParts = firstName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedFirstName = firstNameParts.join('<');

  // Build the first line of MRZ
  let mrzLine1 = `P<${nationality}${formattedLastName}<<${formattedFirstName}`;

  // Pad the first line with '<' to make it exactly 44 characters
  mrzLine1 = mrzLine1.padEnd(44, '<');

  if (mrzLine1.length > 44) {
    throw new Error('First line of MRZ exceeds 44 characters');
  }

  // Build the second line of MRZ
  const mrzLine2 = `${passportNumber}4${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;

  // Combine both lines to form the MRZ
  const mrz = mrzLine1 + mrzLine2;

  // Validate the MRZ length
  if (mrz.length !== 88) {
    throw new Error(`MRZ must be 88 characters long, got ${mrz.length}`);
  }

  return mrz;
}

export function buildFullICAODocumentPayload(
  dgHashAlgo: string,
  signatureType: string,
  mrz: string,
  mrzByteArray: number[],
  eContentHashAlgo: string
): PassportData {
  // Generate MRZ hash first
  const mrzHash = hash(dgHashAlgo, mrzByteArray) as number[];
  const dg2Hash = mrzHash;

  // Generate random hashes for other DGs, passing mrzHash for DG1
  const dataGroupHashes = generateDataGroupHashes(
    mrzHash as number[],
    dg2Hash,
    getHashLen(dgHashAlgo)
  );

  const { privateKeyPem, dsc } = getPkCertPair(signatureType);

  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const signedAttr = generateSignedAttr(hash(eContentHashAlgo, eContent) as number[]);
  const hashAlgo = signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, (byte) => (byte < 128 ? byte : byte - 256));

  return initPassportDataParsing({
    dsc: dsc,
    mrz: mrz,
    dg1Hash: dataGroupHashes.find(([dgNum]) => dgNum === 1)?.[1] || [],
    dg2Hash: dataGroupHashes.find(([dgNum]) => dgNum === 2)?.[1] || [],
    dg2HashHex: byteToHexNibbles(dg2Hash),
    eContent: eContent,
    signedAttr: signedAttr,
    encryptedDigest: signatureBytes,
    documentType: 'mock_passport',
  });
}

function generateRandomBytes(length: number): number[] {
  // Generate numbers between -128 and 127 to match the existing signed byte format
  return Array.from({ length }, () => Math.floor(Math.random() * 256) - 128);
}

function generateDataGroupHashes(
  mrzHash: number[],
  dg2Hash: number[],
  hashLen: number
): [number, number[]][] {
  // Generate hashes for DGs 2-15 (excluding some DGs that aren't typically used)
  const dataGroups: [number, number[]][] = [
    [1, mrzHash], // DG1 must be the MRZ hash
    [2, dg2Hash], // DG2 is a fixed hash for testing
    //[2, generateRandomBytes(hashLen)],
    [3, generateRandomBytes(hashLen)],
    [4, generateRandomBytes(hashLen)],
    [5, generateRandomBytes(hashLen)],
    [7, generateRandomBytes(hashLen)],
    [8, generateRandomBytes(hashLen)],
    // [11, generateRandomBytes(hashLen)],
    // [12, generateRandomBytes(hashLen)],
    // [14, generateRandomBytes(hashLen)],
    [15, generateRandomBytes(hashLen)],
  ];

  return dataGroups;
}
