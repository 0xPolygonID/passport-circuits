import { expect } from 'chai';
import fs from 'fs';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
import jsonInputs from './inputs.json';

const execute = async (command: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (!!stdout) {
        console.log(stdout);
      }

      if (!!stderr) {
        console.error(stderr);
      }

      if (!!error) {
        reject(error.message);
        return;
      }

      resolve(stdout);
    });
  });
};

describe(`anonAadhaarV1`, function () {
  let witness_calculator;
  let circuitName;
  let circuit_graph_path;
  let input_path;
  let witnes_path;
  let zkey_path;
  let v_key;
  let inputs;

  this.timeout(0); // Disable timeout

  before(async () => {
    inputs = jsonInputs;
    circuitName = `anonAadhaarV1`;
    witness_calculator = `./circom-witnesscalc/target/release/calc-witness`;
    circuit_graph_path = `./build/${circuitName}/${circuitName}/${circuitName}.wcd`;
    input_path = `./build/${circuitName}/${circuitName}/input.json`;
    witnes_path = `./build/${circuitName}/${circuitName}/output.wtns`;
    zkey_path = `./build/${circuitName}/${circuitName}/${circuitName}.zkey`;
    v_key = `./build/${circuitName}/${circuitName}/${circuitName}_vkey.json`;
  });

  it('should find the witness calculator', async function () {
    expect(fs.existsSync(witness_calculator)).to.be.true;
  });

  it('should compute a valid witness, generate proof and verify it', async () => {
    // 1. Generate input.json
    fs.writeFileSync(input_path, JSON.stringify(inputs, null, 2));

    // 2. Generate witness
    try {
      const witnesCalcCmd = `time ${witness_calculator} "${circuit_graph_path}" "${input_path}" "${witnes_path}"`;
      await execute(witnesCalcCmd);
    } catch (error) {
      console.log('error!!!', error);
      // if the promise rejects, we land here
      throw error;
    }
    // 3. Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkey_path, witnes_path);

    const vkey = JSON.parse(fs.readFileSync(v_key).toString());

    // 4. Verify proof
    const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    expect(verification).to.be.true;
  });
});
