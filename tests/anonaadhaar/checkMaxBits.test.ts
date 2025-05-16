/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');
import assert from 'assert';

function getMaxIntSize() {
  // Calculate the maximum size of an integer in bits
  const maxIntSize = BigInt(1) << BigInt(64);
  return maxIntSize - BigInt(1);
}

describe('CheckMaxBits', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(path.join(__dirname, `./circuits/checkMaxBits.circom`), {
      include: ['node_modules'],
    });
  });

  before(async () => {});

  it('Success. Input is less than max size of int', async () => {
    await circuit.calculateWitness({
      inputInteger: 1,
    });
  });
  it('Success. Input is lass than max size of int', async () => {
    await circuit.calculateWitness({
      inputInteger: getMaxIntSize(),
    });
  });
  it('Fail. Input is bigger than max size of int', async () => {
    try {
      await circuit.calculateWitness({
        inputInteger: getMaxIntSize() + 1n,
      });
      assert.fail('Expected an Assertion Error but no error was thrown');
    } catch (error: unknown) {
      if (error instanceof Error) {
        assert(
          error.message.includes('Error in template Num2Bits_0'),
          `Expected Assertion Error but got: ${error.message}`
        );
      } else {
        assert.fail('Expected an Error object but got a different type');
      }
    }
  });
});
