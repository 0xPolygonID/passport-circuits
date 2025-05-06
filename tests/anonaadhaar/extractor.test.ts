/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils';
import { Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format';
import { convertBigIntToByteArray, decompressByteArray } from '@anon-aadhaar/core';
import assert from 'assert';
import { testQRData as QRData } from './assets/qr_dev.json';

// Convert the integer back to the original byte values
// based on the circom DigitBytesToInt template
function intToDigitBytes(num: number): number[] {
  const bytes = [];
  let remaining = num;
  const tens = Math.floor(remaining / 10);
  bytes.push(tens + 48); // First byte (tens place + ASCII offset)
  remaining %= 10;
  bytes.push(remaining + 48); // Second byte (ones place + ASCII offset)
  return bytes;
}

describe('Extractor', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(path.join(__dirname, `./circuits/extractor.circom`), {
      include: ['node_modules'],
    });
  });

  before(async () => {});

  it('should extract data', async () => {
    const QRDataBytes = convertBigIntToByteArray(BigInt(QRData));
    const QRDataDecode = decompressByteArray(QRDataBytes);

    const signedData = QRDataDecode.slice(0, QRDataDecode.length - 256);

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

    const witness: any[] = await circuit.calculateWitness({
      data: Uint8ArrayToCharArray(qrDataPadded),
      qrDataPaddedLength: qrDataPaddedLen,
      delimiterIndices: delimiterIndices,
    });

    // Timestamp of signing
    assert(
      new Date(Number(witness[1]) * 1000).getTime() ===
        new Date('2019-03-08T05:30:00.000Z').getTime(),
      `expected ${new Date(Number(witness[1]) * 1000).getTime()} != actual ${new Date('2019-03-08T05:30:00.000Z').getTime()}`
    );

    // Gender
    assert(
      witness[2] === 4366613503740245542741816499068547859478657796760861141829344679607332353738n,
      `expected ${witness[2]} != actual 4366613503740245542741816499068547859478657796760861141829344679607332353738n`
    );

    // Name
    assert(
      witness[3] === 9055566139599481731330446254307216178665393900469433627295807637695545779753n,
      `expected ${witness[3]} != actual 9055566139599481731330446254307216178665393900469433627295807637695545779753n`
    );

    // referenceID
    assert(
      witness[4] === 8692870139543381842326355797973051241381452929675455054202008184608458494411n,
      `expected ${witness[4]} != actual 8692870139543381842326355797973051241381452929675455054202008184608458494411n`
    );

    // address
    assert(
      witness[5] === 2727536908092799094274850447014528629459829531793846928656959765346782168490n,
      `expected ${witness[5]} != actual 2727536908092799094274850447014528629459829531793846928656959765346782168490n`
    );

    // Date of birth on integer format
    assert(Number(witness[6]) === 19840101, `expected ${Number(witness[6])} != actual 19840101`);

    const actualVersion = String.fromCharCode(...intToDigitBytes(Number(witness[7])));
    assert(actualVersion === 'V2');

    // Photo
    // Reconstruction of the photo bytes from packed ints and compare each byte

    // TODO(illia-korotia): we use a new function to convert bytes to bigints inside the circuits.

    // const photo = extractPhoto(Array.from(qrDataPadded), qrDataPaddedLen)
    // const photoWitness = bigIntChunksToByteArray(witness.slice(8, 8 + 32))

    // assert(photoWitness.length === photo.bytes.length)
    // for (let i = 0; i < photoWitness.length; i++) {
    //   assert(photoWitness[i] === photo.bytes[i])
    // }
  });
});
