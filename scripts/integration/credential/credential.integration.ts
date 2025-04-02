import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { genMockPassportData } from '../../../utils/passports/genMockPassportData';
import { getCircuitNameFromPassportData } from '../../../utils/circuits/circuitsName';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
import { fullHashAlgs, hashAlgs } from './test_cases';
import { formatMrz } from '../../../utils/passports/format';
import { newMemEmptyTrie } from 'circomlibjs';
import { prepareCredentialTestData } from '../../../utils/credential';
dotenv.config();

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullHashAlgs : hashAlgs;

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


testSuite.forEach(
  ({ shaAlg }) => {
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
    describe(`Credential - ${shaAlg.toUpperCase()}`, function () {
      let witness_calculator;
      let circuitName;
      let circuit_graph_path;
      let input_path;
      let witnes_path;
      let zkey_path;
      let v_key;
      const lastName = 'KUZNETSOV';
      const firstName = 'VALERIY';
      let inputs;
      this.timeout(0); // Disable timeout
      before(async () => {
        inputs = await prepareCredentialTestData(passportData.mrz, lastName.length, firstName.length, passportData.dg2HashHex || []);
        circuitName = `credential_${shaAlg}`;
        witness_calculator = `./circom-witnesscalc/target/release/calc-witness`;
        circuit_graph_path = `./build/credential/${circuitName}/${circuitName}_graph.wcd`;
        input_path = `./build/credential/${circuitName}/input.json`;
        witnes_path = `./build/credential/${circuitName}/output.wtns`;
        zkey_path = `./build/credential/${circuitName}/${circuitName}_final.zkey`;
        v_key = `./build/credential/${circuitName}/${circuitName}_vkey.json`;
      });

      it('should find the witness calculator', async function () {
        expect(fs.existsSync(witness_calculator)).to.be.true;
      });

      it('should compute a valid witness, generate proof and verify it', async () => {
        // 1. Generate input.json
        fs.writeFileSync(
          input_path,
          JSON.stringify(inputs, null, 2)
        );

        // 2. Generate witness
        try {
          const witnesCalcCmd = `time ${witness_calculator} "${circuit_graph_path}" "${input_path}" "${witnes_path}"`;
          await execute(
           witnesCalcCmd
          );
        } catch (error) {
          console.log('error!!!', error);
          // if the promise rejects, we land here
          throw error;
        }
        // 3. Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.prove(
          zkey_path,
          witnes_path
        );

        const vkey = JSON.parse(
          fs.readFileSync(v_key).toString()
        );

        // 4. Verify proof
        const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        expect(verification).to.be.true;
      });
    });
  }
);
