import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { genMockIdCardData } from '../../../utils/passports/genMockIdCardData';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
import { fullHashAlgs, hashAlgs } from './test_cases';
import { generateCircuitInputsIdCard } from '../../../utils/circuits/generateInputs';

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

testSuite.forEach(({ shaAlg }) => {
  const passportData = genMockIdCardData(
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
  describe(`Idcard - ${shaAlg.toUpperCase()}`, function () {
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
      inputs = await generateCircuitInputsIdCard(passportData, {
        currentDate: new Date('2024-01-01'),
        issuanceDate: 1742578132000000000n,
        expirationDate: 1774114132000000000n,
      });

      circuitName = `idcard_${shaAlg}`;
      witness_calculator = `./circom-witnesscalc/target/release/calc-witness`;
      circuit_graph_path = `./build/idcard/${circuitName}/${circuitName}_graph.wcd`;
      input_path = `./build/idcard/${circuitName}/input.json`;
      witnes_path = `./build/idcard/${circuitName}/output.wtns`;
      zkey_path = `./build/idcard/${circuitName}/${circuitName}_final.zkey`;
      v_key = `./build/idcard/${circuitName}/${circuitName}_vkey.json`;
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
});

// test with 3s folder
testSuite.forEach(({ shaAlg }) => {
  const passportData = genMockIdCardData(
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
  describe(`Idcard for S3 - ${shaAlg.toUpperCase()}`, function () {
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
      inputs = await generateCircuitInputsIdCard(passportData, {
        currentDate: new Date('2024-01-01'),
        issuanceDate: 1742578132000000000n,
        expirationDate: 1774114132000000000n,
      });

      circuitName = `idcard_${shaAlg}`;
      witness_calculator = `./circom-witnesscalc/target/release/calc-witness`;
      circuit_graph_path = `./s3-bucket/credential-keys/${circuitName}/graph.wcd`;
      input_path = `./s3-bucket/credential-keys/${circuitName}/input.json`;
      witnes_path = `./s3-bucket/credential-keys/${circuitName}/output.wtns`;
      zkey_path = `./s3-bucket/credential-keys/${circuitName}/circuit_final.zkey`;
      v_key = `./s3-bucket/credential-keys/${circuitName}/verification_vkey.json`;
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
});
