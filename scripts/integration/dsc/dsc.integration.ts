import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { generateCircuitInputsDSC } from '../../../utils/circuits/generateInputs';
import { fullSigAlgs, sigAlgs } from './test_cases';
import { genMockPassportData } from '../../../utils/passports/genMockPassportData';
import { SignatureAlgorithm } from '../../../utils/types';
import { getCircuitNameFromPassportData } from '../../../utils/circuits/circuitsName';
import serialized_csca_tree from '../../../utils/pubkeys/serialized_csca_tree.json';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
dotenv.config();

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;

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

testSuite.forEach(({ sigAlg, hashFunction, domainParameter, keyLength }) => {
  const passportData = genMockPassportData(
    hashFunction,
    hashFunction,
    `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
    'FRA',
    '000101',
    '300101'
  );
  const passportMetadata = passportData.passportMetadata;

  describe(`DSC chain certificate - ${passportMetadata.cscaHashFunction.toUpperCase()} ${passportMetadata.cscaSignatureAlgorithm.toUpperCase()} ${passportMetadata.cscaCurveOrExponent.toUpperCase()} ${
    passportData.csca_parsed.publicKeyDetails.bits
  }`, function () {
    this.timeout(0); // Disable timeout
    let witness_calculator;

    const inputs = generateCircuitInputsDSC(passportData.dsc, serialized_csca_tree);

    before(async () => {
      witness_calculator = `./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/${getCircuitNameFromPassportData(passportData, 'dsc')}`;
    });

    it('should find the witness calculator', async function () {
      expect(fs.existsSync(witness_calculator)).to.be.true;
    });

    it('should compute a valid witness, generate proof and verify it', async () => {
      // 1. Generate input.json
      fs.writeFileSync(
        `./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/input.json`,
        JSON.stringify(inputs, null, 2)
      );

      // 2. Generate witness
      try {
        await execute(
          `./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/${getCircuitNameFromPassportData(passportData, 'dsc')} ./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/input.json ./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/output.wtns`
        );
      } catch (error) {
        console.log('error!!!', error);
        // if the promise rejects, we land here
      }

      // 3. Generate proof
      const { proof, publicSignals } = await snarkjs.groth16.prove(
        `./build/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/${getCircuitNameFromPassportData(passportData, 'dsc')}_final.zkey`,
        `./package/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/bin/output.wtns`
      );
      console.log('proof', proof);

      const vkey = JSON.parse(
        fs.readFileSync(
          `./build/dsc/${getCircuitNameFromPassportData(passportData, 'dsc')}/${getCircuitNameFromPassportData(passportData, 'dsc')}_vkey.json`
        ).toString()
      );

      // 4. Verify proof
      const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
      expect(verification).to.be.true;
    });
  });
});
