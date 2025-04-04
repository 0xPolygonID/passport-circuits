import {
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
  max_dsc_bytes,
  max_csca_bytes,
} from '../constants/constants';
import { PassportData } from '../types';
import { getLeafCscaTree, getLeafDscTree } from '../trees';
import { getCscaTreeInclusionProof, getDscTreeInclusionProof } from '../trees';
import {
  extractSignatureFromDSC,
  findStartPubKeyIndex,
  formatSignatureDSCCircuit,
  getCertificatePubKey,
  getPassportSignatureInfos,
  pad,
  padWithZeroes,
} from '../passports/passport';
import { formatMrz } from '../passports/format';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple';
import { parseDscCertificateData } from '../passports/passport_parsing/parseDscCertificateData';
import { newMemEmptyTrie } from 'circomlibjs';

export function generateCircuitInputsDSC(dscCertificate: string, serializedCscaTree: string[][]) {
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
  const [startIndex, keyLength] = findStartPubKeyIndex(
    cscaParsed,
    cscaTbsBytesPadded,
    dscMetadata.cscaSignatureAlgorithm
  );

  return {
    raw_csca: cscaTbsBytesPadded.map((x) => x.toString()),
    raw_csca_actual_length: BigInt(cscaParsed.tbsBytes.length).toString(),
    csca_pubKey_offset: startIndex.toString(),
    csca_pubKey_actual_size: BigInt(keyLength).toString(),
    raw_dsc: Array.from(dscTbsBytesPadded).map((x) => x.toString()),
    raw_dsc_padded_length: BigInt(dscTbsBytesLen).toString(), // with the sha padding actually
    csca_pubKey: csca_pubKey_formatted,
    signature,
    merkle_root: root,
    path: path,
    siblings: siblings,
  };
}

export function generateCircuitInputsSignature(
  passportData: PassportData,
  serializedDscTree: string,
  nullifierNonce: number
) {
  const { mrz, eContent, signedAttr } = passportData;
  const passportMetadata = passportData.passportMetadata;
  const dscParsed = passportData.dsc_parsed;

  const [dscTbsBytesPadded] = pad(dscParsed.hashAlgorithm)(dscParsed.tbsBytes, max_dsc_bytes);

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
  const [startIndex, keyLength] = findStartPubKeyIndex(
    dscParsed,
    dscTbsBytesPadded,
    dscParsed.signatureAlgorithm
  );

  const inputs = {
    raw_dsc: dscTbsBytesPadded.map((x) => x.toString()),
    raw_dsc_actual_length: [BigInt(dscParsed.tbsBytes.length).toString()],
    dsc_pubKey_offset: startIndex,
    dsc_pubKey_actual_size: [BigInt(keyLength).toString()],
    // Convert signed bytes to unsigned (0-255)
    dg1_hash_bytes: passportData.dg1Hash.map((byte) => (byte < 0 ? byte + 256 : byte)),
    dg1_hash_offset: passportMetadata.dg1HashOffset,
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
    linkNonce: 1,
    nullifierNonce: nullifierNonce,
  };

  return Object.entries(inputs)
    .map(([key, value]) => ({
      [key]: formatInput(value),
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

export async function generateCircuitInputsCredential(passportData: PassportData) {
  const mrzByteArray = formatMrz(passportData.mrz);
  if (mrzByteArray.length !== 93) {
    throw new Error('MRZ should be 93 bytes long');
  }

  const treeLevels = 13;
  const tree = await newMemEmptyTrie();
  // key-value pairs to build the credential template
  const template = [
    '12891444986491254085560597052395677934694594587847693550621945641098238258096',
    '1173248646377539879946536107369421994820880702773342056419798525241229208349', // credentialStatus.type
    '4809579517396073186705705159186899409599314609122482090560534255195823961763',
    '3930329666255035859341917616531724337843722428795107776052883525249467734017', // credentialSubject.type
    '1876843462791870928827702802899567513539510253808198232854545117818238902280',
    '6863952743872184967730390635778205663409140607467436963978966043239919204962', // credentialSchema.type
    '14122086068848155444790679436566779517121339700977110548919573157521629996400',
    '8932896889521641034417268999369968324098807262074941120983759052810017489370', // type.id
    '18943208076435454904128050626016920086499867123501959273334294100443438004188',
    '3930329666255035859341917616531724337843722428795107776052883525249467734017', // type.id
    '2282658739689398501857830040602888548545380116161185117921371325237897538551',
    '6785128192015566537155412245008504798482626052796872471438218406454907503679', // credentialSchema.id
    '4817156672888655522763064392525239094511187154831557262772815264540847425378',
    '0', // credentialSubject.dateOfBirth
    '2661316897620170050641842010022238582485958559445913964628121513401804945508',
    '0', // credentialSubject.documentExpirationDate
    '17812501853592608022106438142029031484125620705472224666715824544873239913147',
    '0', // credentialSubject.firstName
    '643493878926457766162531104335565260785288743937125657511062755781004518297',
    '0', // credentialSubject.fullName
    '5768075745493428917651844471684022554030750947591103713762344570867180513614',
    '0', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620',
    '0', // credentialSubject.governmentIdentifierType
    '16829829523990922339853122033176330960757159233571217495904710638791793740933',
    '0', // credentialSubject.sex
    '18652354674254268839450839640508993614932212252620036777561285260846450401086',
    '0', // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554',
    '0', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675',
    '0', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773',
    '0', // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585',
    '0', // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215',
    '0', // issuer.id
    '12721581730399791084220775389224758160887300573168177512619749567794685336757',
    '0', // credentialSubject.nationalities
    '8420111610095993874869544651671831438228943062702729758375308097770323355054',
    '0', // credentialSubject.nationalities
  ];
  for (let i = 0; i < template.length; i += 2) {
    const key = tree.F.e(template[i]);
    const value = tree.F.e(template[i + 1]);
    await tree.insert(key, value);
  }
  const templateRoot = tree.F.toObject(tree.root);

  const currentDate = formatDate(new Date());
  const issuanceDate = Math.round(+new Date() / 1000);
  const expirationDate = issuanceDate + 365 * 24 * 60 * 60; // 1 year
  const updateTemplate = [
    '4817156672888655522763064392525239094511187154831557262772815264540847425378',
    '19960309', // credentialSubject.dateOfBirth
    '2661316897620170050641842010022238582485958559445913964628121513401804945508',
    '20350803', // credentialSubject.documentExpirationDate
    '17812501853592608022106438142029031484125620705472224666715824544873239913147',
    '779590574833975594150553032190316165100034337907701477766077549696170325957', // credentialSubject.firstName
    '643493878926457766162531104335565260785288743937125657511062755781004518297',
    '16124395655319932562687594154333620461512120815155591900166934828565073655159', // credentialSubject.fullName
    '5768075745493428917651844471684022554030750947591103713762344570867180513614',
    '3286800018689036072036595048281161368331306321215602580795106602635276597696', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620',
    '12343105779965610540047025345938704312955329035594806470260411576419571786879', // credentialSubject.governmentIdentifierType
    '16829829523990922339853122033176330960757159233571217495904710638791793740933',
    '4366613503740245542741816499068547859478657796760861141829344679607332353738', // credentialSubject.sex
    '18652354674254268839450839640508993614932212252620036777561285260846450401086',
    '0', // credentialStatus.revocationNonce
    '11896622783611378286548274235251973588039499084629981048616800443645803129554',
    '19110037108107876991711039133061160427992750920441382464574409120359328284962', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675',
    '18026946060490633582346941999242407265442400633018823452652749104672360129751', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773',
    (expirationDate * 1000000000).toString(), // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585',
    (issuanceDate * 1000000000).toString(), // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215',
    '12146166192964646439780403715116050536535442384123009131510511003232108502337', // issuer.id
    '12721581730399791084220775389224758160887300573168177512619749567794685336757',
    '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
    '8420111610095993874869544651671831438228943062702729758375308097770323355054',
    '14193146200435563417722817655626671239476419932450502386457224894805250323461', // credentialSubject.nationalities
  ];
  const siblings = [[]];
  for (let i = 0; i < updateTemplate.length; i += 2) {
    const key = tree.F.e(updateTemplate[i]);
    const value = tree.F.e(updateTemplate[i + 1]);
    const res = await tree.update(key, value);
    for (let i = 0; i < res.siblings.length; i++)
      res.siblings[i] = tree.F.toObject(res.siblings[i]);
    while (res.siblings.length < treeLevels) res.siblings.push(0);
    siblings.push(res.siblings);
  }

  const lastNameSize = passportData.mrz.split('<<')[0].slice(5).length;
  const firstNameSize = passportData.mrz.split('<<')[1].replace('<', ' ').length;

  return {
    dg1: [...mrzByteArray],
    lastNameSize: lastNameSize,
    firstNameSize: firstNameSize,
    currentDate: currentDate,

    revocationNonce: 0,
    credentialStatusID:
      '19110037108107876991711039133061160427992750920441382464574409120359328284962',
    credentialSubjectID:
      '18026946060490633582346941999242407265442400633018823452652749104672360129751',
    userID: '23747161200420134456844951198264139815921171975208487354806063665905574145',
    issuer: '12146166192964646439780403715116050536535442384123009131510511003232108502337',
    issuanceDate: issuanceDate.toString(),

    linkNonce: 1,
    templateRoot: templateRoot.toString(),
    siblings: siblings.map((arr) => arr.map((x: BigInt) => x.toString())),
  };
}

function formatDate(d) {
  //get the month
  var month = d.getMonth();
  //get the day
  //convert day to string
  var day = d.getDate().toString();
  //get the year
  var year = d.getFullYear();

  //pull the last two digits of the year
  year = year.toString().substr(-2);

  //increment month by 1 since it is 0 indexed
  //converts month to a string
  month = (month + 1).toString();

  //if month is 1-9 pad right with a 0 for two digits
  if (month.length === 1) {
    month = '0' + month;
  }

  //if day is between 1-9 pad right with a 0 for two digits
  if (day.length === 1) {
    day = '0' + day;
  }

  //return the string "yyMMdd"
  return year + month + day;
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
