/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');
import assert from 'assert';

describe('Calculate the century', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(path.join(__dirname, `./circuits/timestamp.circom`), {
      include: ['node_modules'],
    });
  });

  before(async () => {});

  it('Warn. We cant support a date that is more than 100 years different from today', async () => {
    const witness: any[] = await circuit.calculateWitness({
      date: 250429,
      currentDate: 250430,
    });
    assert(witness[1] === 20250429n);
  });
});
