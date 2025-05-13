/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');

import path from 'path';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils';
import {
  bigIntToChunkedBytes,
  bufferToHex,
  Uint8ArrayToCharArray,
} from '@zk-email/helpers/dist/binary-format';
import {
  convertBigIntToByteArray,
  decompressByteArray,
  splitToWords,
  extractPhoto,
} from '@anon-aadhaar/core';
import fs from 'fs';
import crypto from 'crypto';
import assert from 'assert';
import { buildPoseidon } from 'circomlibjs';
import { testQRData } from './assets/qr_dev.json';
import { bytesToIntChunks, padArrayWithZeros } from './utils';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { newMemEmptyTrie } from 'circomlibjs';

let testAadhaar = true;
let QRData: string = testQRData;
if (process.env.REAL_DATA === 'true') {
  testAadhaar = false;
  if (typeof process.env.AADHAAR_QR_DATA === 'string') {
    QRData = process.env.AADHAAR_QR_DATA;
  } else {
    throw Error('You must set .env var AADHAAR_QR_DATA when using real data.');
  }
}

const getCertificate = (_isTest: boolean) => {
  return _isTest ? 'testPublicKey.pem' : 'uidai_offline_publickey_26022021.cer';
};

async function prepareTestData() {
  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData));
  const decodedData = decompressByteArray(qrDataBytes);

  const signatureBytes = decodedData.slice(decodedData.length - 256, decodedData.length);

  const signedData = decodedData.slice(0, decodedData.length - 256);

  const [qrDataPadded, qrDataPaddedLen] = sha256Pad(signedData, 512 * 3);

  const delimiterIndices: number[] = [];
  for (let i = 0; i < qrDataPadded.length; i++) {
    if (qrDataPadded[i] === 255) {
      delimiterIndices.push(i);
    }
    if (delimiterIndices.length === 18) {
      break;
    }
  }

  const signature = BigInt('0x' + bufferToHex(Buffer.from(signatureBytes)).toString());

  const pkPem = fs.readFileSync(path.join(__dirname, './assets', getCertificate(testAadhaar)));
  const pk = crypto.createPublicKey(pkPem);

  const pubKey = BigInt(
    '0x' + bufferToHex(Buffer.from(pk.export({ format: 'jwk' }).n as string, 'base64url'))
  );

  const treeLevels = 9;
  const tree = await newMemEmptyTrie();
  // key-value pairs to build the credential template
  const template = [
    '4809579517396073186705705159186899409599314609122482090560534255195823961763',
    '3930329666255035859341917616531724337843722428795107776052883525249467734017', // credentialSubject.type
    '12891444986491254085560597052395677934694594587847693550621945641098238258096',
    '1173248646377539879946536107369421994820880702773342056419798525241229208349', // credentialStatus.type
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
    '643493878926457766162531104335565260785288743937125657511062755781004518297',
    '0', // credentialSubject.fullName
    '5404445087797932868809306015538218496376343675339731487859545200224329791072',
    '0', // credentialSubject.gender
    '5768075745493428917651844471684022554030750947591103713762344570867180513614',
    '0', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620',
    '0', // credentialSubject.governmentIdentifierType
    '18652354674254268839450839640508993614932212252620036777561285260846450401086',
    '0', // credentialStatus.revocationNonce
    '2789441998411353097504888849796647342929687866714787904727157138859134659534',
    '0', // credentialSubject.addresses
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
    '8420111610095993874869544651671831438228943062702729758375308097770323355054',
    '0', // credentialSubject.nationalities.nationality2CountryCode
  ];
  for (let i = 0; i < template.length; i += 2) {
    const key = tree.F.e(template[i]);
    const value = tree.F.e(template[i + 1]);
    await tree.insert(key, value);
  }
  const templateRoot = tree.F.toObject(tree.root);

  const updateTemplate = [
    '4817156672888655522763064392525239094511187154831557262772815264540847425378',
    '19840101', // credentialSubject.dateOfBirth
    '643493878926457766162531104335565260785288743937125657511062755781004518297',
    '9055566139599481731330446254307216178665393900469433627295807637695545779753', // credentialSubject.fullName
    '5404445087797932868809306015538218496376343675339731487859545200224329791072',
    '4366613503740245542741816499068547859478657796760861141829344679607332353738', // credentialSubject.gender
    '5768075745493428917651844471684022554030750947591103713762344570867180513614',
    '8692870139543381842326355797973051241381452929675455054202008184608458494411', // credentialSubject.governmentIdentifier
    '12037662945351652395520680282306597407040165994104304811455681806232413956620',
    '9625374645547036629006936456349235401907107363945660607867283679088689283602', // credentialSubject.governmentIdentifierType
    '18652354674254268839450839640508993614932212252620036777561285260846450401086',
    '0', // credentialStatus.revocationNonce
    '2789441998411353097504888849796647342929687866714787904727157138859134659534',
    '2727536908092799094274850447014528629459829531793846928656959765346782168490', // credentialSubject.addresses
    '11896622783611378286548274235251973588039499084629981048616800443645803129554',
    '21443120396673802944321218348342526257281535081932068217446469001474300304', // credentialStatus.id
    '4792130079462681165428511201253235850015648352883240577315026477780493110675',
    '18026946060490633582346941999242407265442400633018823452652749104672360129751', // credentialSubject.id
    '13483382060079230067188057675928039600565406666878111320562435194759310415773',
    '1567799640000000000', // expirationDate.id
    '8713837106709436881047310678745516714551061952618778897121563913918335939585',
    '1552023000000000000', // issuanceDate.id
    '5940025296598751562822259677636111513267244048295724788691376971035167813215',
    '12146166192964646439780403715116050536535442384123009131510511003232108502337', // issuer.id
    '8420111610095993874869544651671831438228943062702729758375308097770323355054',
    '18607257606080006340563297173112093370969227692083664718938277647469374823290', // credentialSubject.nationalities.nationality2CountryCode
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

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(qrDataPadded),
    qrDataPaddedLength: qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    nullifierSeed: 12345678,
    signalHash: 1001,

    revocationNonce: 0,
    credentialStatusID:
      '21443120396673802944321218348342526257281535081932068217446469001474300304',
    credentialSubjectID:
      '18026946060490633582346941999242407265442400633018823452652749104672360129751',
    userID: '23747161200420134456844951198264139815921171975208487354806063665905574145',
    issuer: '12146166192964646439780403715116050536535442384123009131510511003232108502337',
    expirationTime: '15776640', // Duration of 6 months in seconds

    templateRoot: templateRoot,
    siblings: siblings,
  };

  return {
    inputs,
    qrDataPadded,
    signedData,
    decodedData,
    pubKey,
    qrDataPaddedLen,
  };
}

describe('AadhaarVerifier', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(
      path.join(__dirname, `../../circuits/anonAadhaarV1/instances/anonAadhaarV1.circom`),
      {
        include: ['node_modules'],
      }
    );
  });

  it('should generate witness for circuit with Sha256RSA signature', async () => {
    const { inputs } = await prepareTestData();

    await circuit.calculateWitness(inputs);
  });

  it('should output hash of pubkey', async () => {
    const { inputs, pubKey } = await prepareTestData();

    const witness = await circuit.calculateWitness(inputs);

    // Calculate the Poseidon hash with pubkey chunked to 9*242 like in circuit
    const poseidon = await buildPoseidon();
    const pubkeyChunked = bigIntToChunkedBytes(pubKey, 242, 9);
    const hash = poseidon(pubkeyChunked);

    assert(witness[1] === BigInt(poseidon.F.toObject(hash)));
  });

  it('should compute nullifier correctly', async () => {
    const nullifierSeed = 12345678;

    const { inputs, qrDataPadded, qrDataPaddedLen } = await prepareTestData();
    inputs.nullifierSeed = nullifierSeed;

    const witness = await circuit.calculateWitness(inputs);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poseidon: any = await buildPoseidon();

    const { bytes: photoBytes } = extractPhoto(Array.from(qrDataPadded), qrDataPaddedLen);
    const photoBytesPacked = padArrayWithZeros(bytesToIntChunks(new Uint8Array(photoBytes)), 32);

    const first16 = poseidon([...photoBytesPacked.slice(0, 16)]);
    const last16 = poseidon([...photoBytesPacked.slice(16, 32)]);
    const nullifier = poseidon([nullifierSeed, first16, last16]);

    const expectedNullifier = BigInt(poseidon.F.toString(nullifier));
    assert(
      witness[2] == expectedNullifier,
      `Nullifier mismatch: ${witness[2]} != ${expectedNullifier}`
    );

    assert(witness[7] === 382n, `Qr code version mismatch: ${witness[7]} != 382`);
  });

  it('should calculate hashIndex and hashValue', async () => {
    /*
    Credential example:
    {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.iden3.io/core/jsonld/iden3proofs.jsonld",
    "ipfs://QmZbsTnRwtCmbdg3r9o7Txid37LmvPcvmzVi1Abvqu1WKL"
  ],
  "type": [
    "VerifiableCredential",
    "BasicPerson"
  ],
  "expirationDate": "2019-09-06T19:54:00Z",
  "issuanceDate": "2019-03-08T05:30:00Z",
  "credentialSubject": {
    "addresses": {
      "primaryAddress": {
        "addressLine1": "C/O Ishwar Chand East Delhi  B-31, 3rd Floor  110051 Krishna Nagar Delhi Radhey Shyam Park Extension Gandhi Nagar Krishna Nagar"
      }
    },
    "dateOfBirth": 19840101,
    "fullName": "Sumit Kumar",
    "gender": "M",
    "governmentIdentifier": "269720190308114407437",
    "governmentIdentifierType": "other",
    "id": "did:iden3:privado:main:2Scn2RfosbkQDMQzQM5nCz3Nk5GnbzZCWzGCd3tc2G",
    "type": "BasicPerson",
    "nationalities": {
      "nationality2CountryCode": "IND"
    }
  },
  "credentialStatus": {
    "id": "did:iden3:privado:main:2Si3eZUE6XetYsmU5dyUK2Cvaxr1EEe65vdv2BML4L/credentialStatus?revocationNonce=1051565438&contractAddress=80001:0x2fCE183c7Fbc4EbB5DB3B0F5a63e0e02AE9a85d2",
    "type": "Iden3OnchainSparseMerkleTreeProof2023",
    "revocationNonce": 0
  },
  "issuer": "did:iden3:privado:main:2Si3eZUE6XetYsmU5dyUK2Cvaxr1EEe65vdv2BML4L",
  "credentialSchema": {
    "id": "ipfs://QmTojMfyzxehCJVw7aUrdWuxdF68R7oLYooGHCUr9wwsef",
    "type": "JsonSchema2023"
  }
}
    */
    const { inputs } = await prepareTestData();

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);
    // compare the results with the results of the go-core library
    // hashIndex
    assert(
      witness[3] === 8962210577559804966128815367603307267851593511078544508148374517475917447981n,
      `HashIndex mismatch: ${witness[3]} != 8962210577559804966128815367603307267851593511078544508148374517475917447981`
    );
    // hashValue
    assert(
      witness[4] === 18008128381428548624282039899106504460765785745693349906422544723715663713055n,
      `HashValue mismatch: ${witness[4]} != 18008128381428548624282039899106504460765785745693349906422544723715663713055`
    );
    // compare issuanceDate is equal to date from the QR code
    assert(
      new Date(Number(witness[5]) * 1000).getTime() === new Date('2019-03-08T05:30:00Z').getTime()
    );
    assert(
      new Date(Number(witness[6]) * 1000).getTime() === new Date('2019-09-06T19:54:00Z').getTime()
    );
    // compare expirationDate is issuedDate + 6 months(~15776640 seconds)
    const diff = witness[6] - witness[5];
    assert(BigInt(diff) === BigInt(15776640));
    // compare templateRoot
    assert(
      witness[10] === 5086122537745747254581491345739247223240245653900608092926314604019374578867n,
      `Template root mismatch: ${witness[9]} != 5086122537745747254581491345739247223240245653900608092926314604019374578867`
    );
    // compare issuer
    assert(
      witness[11] ===
        12146166192964646439780403715116050536535442384123009131510511003232108502337n,
      `Issuer mismatch: ${witness[10]} != 12146166192964646439780403715116050536535442384123009131510511003232108502337`
    );
  });
});
