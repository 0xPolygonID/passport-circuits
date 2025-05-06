import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert } from 'chai';
import { genMockPassportData } from '../../utils/passports/genMockPassportData';
import { generateCircuitInputsCredential } from '../../utils/circuits/generateInputs';
import { hashAlgs, fullHashAlgs } from './test_cases';
import { wasm as wasm_tester } from 'circom_tester';
import { Poseidon } from '@iden3/js-crypto';

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
  describe(`credential_${shaAlg}.circom`, function () {
    this.timeout(0);

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
      const passportData = genMockPassportData(
        shaAlg,
        shaAlg,
        'rsa_sha1_65537_2048', // not important for this test
        'UKR',
        '960309',
        '350803',
        'AC1234567',
        'KUZNETSOV',
        'VALERIY'
      );
      const inputs = await generateCircuitInputsCredential(passportData, {
        currentDate: new Date('2024-01-01'),
        issuanceDate: 1742578132000000000n,
        expirationDate: 1774114132000000000n
      });

      const w = await circuit.calculateWitness(inputs, true);
      await circuit.checkConstraints(w);
      // Hash Index
      assert(
        w[1] === 21746881643302549454056364807195696746352973338897115776686822385268131050953n,
        `Hash Index: ${w[1]}`
      );

      // Hash Value
      assert(
        w[2] === 20008859012517445819901041236908823100073815023181291226591238728478957482360n,
        `Hash Value: ${w[2]}`
      );

      const linkId = Poseidon.spongeHashX(
        [
          Poseidon.hashBytes(new Uint8Array(passportData.dg1Hash)),
          BigInt(inputs.linkNonce),
        ],
        2
      );
      assert(w[3] === linkId);

      // Compare template root
      assert(w[6] === 20928513831198457326281890226858421791230183718399181538736627412475062693938n,
        `Template root: ${w[6]}`
      );
    });
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
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha1_65537_2048',
      'UKR',
      '960309',
      '240803', // Expired date in the past
      'AC1234567',
      'KUZNETSOV',
      'VALERIY'
    );
    // generateCircuitInputsCredential uses Date.now() to set the current date
    // so passportData.expirationDate should be in the past to trigger the error
    // in our case is 240803
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
  it(`CurrentDate is bigger then 1,048,575`, async function () {
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha1_65537_2048',
      'UKR',
      '960309',
      '350803',
      'AC1234567',
      'KUZNETSOV',
      'VALERIY'
    );
    const inputs = await generateCircuitInputsCredential(passportData);
    inputs.currentDate = 1048576; // Set currentDate to a value greater than int(20 bits): max = 1,048,575
    try {
      await circuit.calculateWitness(inputs, true);
      assert.fail('Expected an Assertion Error but no error was thrown');
    } catch (error: unknown) {
      console.log('error', error);
      if (error instanceof Error) {
        assert(
          error.message.includes('Error in template CheckMaxBits'),
          `Expected Assertion Error but got: ${error.message}`
        );
      } else {
        assert.fail('Expected an Error object but got a different type');
      }
    }
  });
  it(`IssuanceDate is bigger then int64`, async function () {
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha1_65537_2048',
      'UKR',
      '960309',
      '350803',
      'AC1234567',
      'KUZNETSOV',
      'VALERIY'
    );
    const inputs = await generateCircuitInputsCredential(passportData);
    inputs.issuanceDate = "21888242871839275222246405745257275088548364400416034343698204186575776959616"
    try {
      await circuit.calculateWitness(inputs, true);
      assert.fail('Expected an Assertion Error but no error was thrown');
    } catch (error: unknown) {
      console.log('error', error);
      if (error instanceof Error) {
        assert(
          error.message.includes('Error in template CheckMaxBits'),
          `Expected Assertion Error but got: ${error.message}`
        );
      } else {
        assert.fail('Expected an Error object but got a different type');
      }
    }
  });
});
