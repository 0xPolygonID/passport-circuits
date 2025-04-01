import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert } from 'chai';
import { genMockPassportData } from '../../utils/passports/genMockPassportData';
import { hashAlgs, fullHashAlgs } from './test_cases';
import { wasm as wasm_tester } from 'circom_tester';
import { Poseidon } from '@iden3/js-crypto';
import { generateCircuitInputsCredential } from '../../utils/circuits/generateInputs';

dotenv.config();

const path = require('path');
const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullHashAlgs : hashAlgs;

// Define a type for the circuit
interface Circuit {
  calculateWitness: (inputs: any, witness?: boolean) => Promise<bigint[]>;
  checkConstraints: (witness: bigint[]) => Promise<void>;
  release: () => void;
}

testSuite.forEach(({ shaAlg, shaLength }) => {
  console.log(`Running tests for ${shaAlg}...`);
  describe(`credential_${shaAlg}.circom`, function () {
    this.timeout(0);

    assert(process.env.FULL_TEST_SUITE === 'false' || process.env.FULL_TEST_SUITE === undefined, 'FULL_TEST_SUITE not supposed for all shaAlgs');

    let circuit;
    before(async () => {
      circuit = await wasm_tester(
        path.join(__dirname, `../../circuits/credential/instances/credential_${shaAlg}.circom`),
        {
          include: ['node_modules'],
        }
      );
    });
    after(async () => {
      circuit.release();
    });

    it(`Passport is valid and hashAlg is ${shaAlg}`, async function () {
      const lastName = 'KUZNETSOV';
      const firstName = 'VALERIY';
      const passportData = genMockPassportData(
        shaAlg,
        shaAlg,
        'rsa_sha256_65537_2048', // not important for this test
        'UKR',
        '960309',
        '350803',
        'AC1234567',
        lastName,
        firstName
      );
      const inputs = await generateCircuitInputsCredential(passportData);

      const w = await circuit.calculateWitness(inputs, true);
      await circuit.checkConstraints(w);
      // Document code hash (output 1)
      assert(
        w[1] === 12343105779965610540047025345938704312955329035594806470260411576419571786879n
      );

      // Issuing State or organization hash (output 2)
      assert(
        w[2] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n
      );

      // Last name hash (output 3)
      assert(
        w[3] === 16124395655319932562687594154333620461512120815155591900166934828565073655159n
      );

      // First name hash (output 4)
      assert(w[4] === 779590574833975594150553032190316165100034337907701477766077549696170325957n);

      // Document number hash (output 5)
      assert(
        w[5] === 3286800018689036072036595048281161368331306321215602580795106602635276597696n
      );

      // Nationality hash (output 6)
      assert(
        w[6] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n
      );

      // Date of Birth hash (output 7)
      assert(w[7] === 19960309n);

      // Sex hash (output 8)
      assert(
        w[8] === 4366613503740245542741816499068547859478657796760861141829344679607332353738n
      );

      // Date of expiry hash (output 9)
      assert(w[9] === 20350803n);

      // Hash Index
      assert(
        w[10] === 19870325861166529664609721574092177771035485503590811272439060431918456510657n,
        `Hash Index: ${w[10]}`
      );

      // Hash Value
      assert(
        w[11] === 20661880459224054680311568334655353588113926319608771155576598304028828385849n,
        `Hash Value: ${w[11]}`
      );

      const linkId_js = Poseidon.spongeHashX(
        [
          Poseidon.hashBytes(new Uint8Array(passportData.dg1Hash)),
          Poseidon.hashBytes(new Uint8Array(passportData.dg2Hash)),
          BigInt(inputs.linkNonce),
        ],
        3
      );
      console.log('\x1b[35m%s\x1b[0m', 'js: linkId:', linkId_js);
      const linkId = BigInt((await circuit.getOutput(w, ['linkId'])).linkId);
      console.log('\x1b[34m%s\x1b[0m', 'circom linkId', linkId);
      assert(linkId === linkId_js);
      
      // Compare template root
      assert(w[15] === 11355012832755671330307538002239263753806804904003813746452342893352381210514n);
    });
    /*
  it(`Double last name`, async function() {
    const {mrz, surnameSize, givenNamesSize} = generateMRZ(
      "P",
      "UKR",
      "KUZNETSOV",
      "VALERIY",
      "AC1234567",
      "UKR",
      "960309",
      "M",
      "350803",
    );
    const inputs = await prepareTestData(docs, 11, 8);
    const w = await circuit.calculateWitness(inputs, true);
    await circuit.checkConstraints(w);
    // Document code hash (output 1)
    assert(w[1] === 12343105779965610540047025345938704312955329035594806470260411576419571786879n);

    // Issuing State or organization hash (output 2)
    assert(w[2] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n);

    // Last name hash (output 3)
    assert(w[3] === 16684418381729930583844995012712504418990732401801825107387099797112025696324n);

    // First name hash (output 4)
    assert(w[4] === 7882444430312531813986531690355256034187461560449276183886474511877560234822n);

    // Document number hash (output 5)
    assert(w[5] === 13365184592845315309100297120259965838903705444844448460767566282483182375642n);

    // Nationality hash (output 6)
    assert(w[6] === 14193146200435563417722817655626671239476419932450502386457224894805250323461n);

    // Date of Birth hash (output 7)
    assert(w[7] === 19980309n);

    // Sex hash (output 8)
    assert(w[8] === 4366613503740245542741816499068547859478657796760861141829344679607332353738n);

    // Date of expiry hash (output 9)
    assert(w[9] === 20310803n);
  });
  */
  });
});

describe('credential_sha256.circom', function () {
  this.timeout(0);
  let circuit: Circuit;
  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/credential/instances/credential_sha256.circom'),
      {
        include: ['node_modules'],
      }
    );
  });
  after(async () => {
    circuit.release();
  });

  it(`Passport is expired`, async function () {
    const lastName = 'KUZNETSOV';
    const firstName = 'VALERIY';
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_4096',
      'UKR',
      '960309',
      '240803',
      'AC1234567',
      lastName,
      firstName
    );
    const inputs = await generateCircuitInputsCredential(passportData);
    try {
      await circuit.calculateWitness(inputs, true);
      assert.fail('Expected an Assertion Error but no error was thrown');
    } catch (error: unknown) {
      if (error instanceof Error) {
        assert(
          error.message.includes('Assert Failed'),
          `Expected Assertion Error but got: ${error.message}`
        );
      } else {
        assert.fail('Expected an Error object but got a different type');
      }
    }
  });
});
