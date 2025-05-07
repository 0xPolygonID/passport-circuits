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

function generateTestData(holderName: string): { name: string; expectedTrailing: number } {
  const nameOfHolder = holderName.padEnd(39, '<');
  return {
    name: nameOfHolder,
    expectedTrailing: 39 - holderName.length,
  };
}

describe('CountTrailing Circuit', function () {
  this.timeout(0);
  let circuit: Circuit;

  before(async () => {
    circuit = await wasm_tester(path.join(__dirname, './circuits/countTrailing.circom'), {
      include: ['node_modules'],
    });
  });

  after(async () => {
    circuit.release();
  });

  const testCases = [
    generateTestData('ALICE'),
    generateTestData('REEVES<<KEANU'),
    generateTestData('NICHOLSON<<JACK<TORRANCE'),
    generateTestData('KENOBI<<OBI<WAN'),
    generateTestData('GANDALF<WHITE<<THE<GRAY'),
  ];

  testCases.forEach(({ name, expectedTrailing }, index) => {
    it(`Test Case ${index + 1}: "${name}"`, async function () {
      const utf8Array = Array.from(name).map((char) => char.charCodeAt(0)); // Convert to UTF-8 array

      const witness = await circuit.calculateWitness(
        {
          string: utf8Array,
          symbol: 60, // ASCII code for '<'
        },
        true
      );

      assert(
        witness[1] === BigInt(expectedTrailing),
        `Test Case ${index + 1} Failed: Expected ${expectedTrailing} but got ${witness[1]}`
      );
    });
  });
});
