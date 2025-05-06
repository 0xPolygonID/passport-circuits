import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';

dotenv.config();

const path = require('path');

// Define a type for the circuit
interface Circuit {
  calculateWitness: (inputs: any, witness?: boolean) => Promise<bigint[]>;
  checkConstraints: (witness: bigint[]) => Promise<void>;
  release: () => void;
}

const CIRCOM_ONE_YEAR_SEC = 31536000; // 365 days * 24 hours * 60 minutes * 60 seconds

describe('', function () {
  this.timeout(0);
  let circuit: Circuit;
  before(async () => {
    circuit = await wasm_tester(path.join(__dirname, './circuits/dateDiffGreaterThanYear.circom'), {
      include: ['node_modules'],
    });
  });
  after(async () => {
    circuit.release();
  });
  it(`Passport expiration more then one year`, async function () {
    const currentTimestamp = 1743515931; // 2025-04-01T00:00:00Z
    const expirationTimestamp = 1809179940; // 2027-05-01T00:00:00Z
    const inputs = {
      currentTimestamp: currentTimestamp,
      expirationTimestamp: expirationTimestamp,
    };

    const w = await circuit.calculateWitness(inputs, true);
    await circuit.checkConstraints(w);
    assert.equal(
      w[1],
      BigInt(1743515931 + CIRCOM_ONE_YEAR_SEC),
      'The difference is less than one year'
    );
    console.log('Expiration current time + 1 year', w[1]);
  });
  it(`Passport expiration less then one year`, async function () {
    const currentTimestamp = 1743515931; // 2025-04-01T00:00:00Z
    const expirationTimestamp = 1746107940; // 2025-05-01T00:00:00Z
    const inputs = {
      currentTimestamp: currentTimestamp,
      expirationTimestamp: expirationTimestamp,
    };

    const w = await circuit.calculateWitness(inputs, true);
    await circuit.checkConstraints(w);
    assert.equal(w[1], BigInt(expirationTimestamp), 'The difference is less than one year');
    console.log('expiration time is expiration time of passport:', w[1]);
  });
  it(`Current time is greater than expiration time`, async function () {
    const currentTimestamp = 1809179940; // 2027-05-01T00:00:00Z
    const expirationTimestamp = 1746107940; // 2025-05-01T00:00:00Z
    const inputs = {
      currentTimestamp: currentTimestamp,
      expirationTimestamp: expirationTimestamp,
    };

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
      console.log('actual error', error.message);
    }
  });
});
