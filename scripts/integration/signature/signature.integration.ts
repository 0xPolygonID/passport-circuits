import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { generateCircuitInputsSignature } from '../../../utils/circuits/generateInputs';
import { fullSigAlgs, sigAlgs } from './test_cases';
import { genMockPassportData } from '../../../utils/passports/genMockPassportData';
import { SignatureAlgorithm } from '../../../utils/types';
import { getCircuitNameFromPassportData } from '../../../utils/circuits/circuitsName';
import serialized_dsc_tree from '../../../utils/pubkeys/serialized_dsc_tree.json';
import { poseidon6 } from 'poseidon-lite';
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

testSuite.forEach(({ dgHashAlgo, eContentHashAlgo, sigAlg, hashFunction, domainParameter, keyLength }) => {
  const passportData = genMockPassportData(
    hashFunction,
    hashFunction,
    `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
    'FRA',
    '000101',
    '300101'
  );
  const passportMetadata = passportData.passportMetadata;

  describe(`Signature Dsc - ${dgHashAlgo.toUpperCase()} ${eContentHashAlgo.toUpperCase()} ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${
    domainParameter
  } ${keyLength}`, function () {
    this.timeout(0);
    let witness_calculator;

    const secret = poseidon6('SECRET'.split('').map((x) => BigInt(x.charCodeAt(0)))).toString();

    const inputs = generateCircuitInputsSignature(
      secret,
      passportData,
      serialized_dsc_tree as string
    );

    before(async () => {
      witness_calculator = `./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/${getCircuitNameFromPassportData(passportData, 'signature')}`;
    });

    it('should find the witness calculator', async function () {
      expect(fs.existsSync(witness_calculator)).to.be.true;
    });

    it('should compute a valid witness, generate proof and verify it', async () => {
      // 1. Generate input.json
      fs.writeFileSync(
        `./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/input.json`,
        JSON.stringify(inputs, null, 2)
      );

      // 2. Generate witness
      try {
        await execute(
          `./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/${getCircuitNameFromPassportData(passportData, 'signature')} ./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/input.json ./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/output.wtns`
        );
      } catch (error) {
        console.log('error!!!', error);
        // if the promise rejects, we land here
      }

      // 3. Generate proof
      const { proof, publicSignals } = await snarkjs.groth16.prove(
        `./build/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/${getCircuitNameFromPassportData(passportData, 'signature')}_final.zkey`,
        `./package/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/bin/output.wtns`
      );
      console.log('proof', proof);

      const vkey = JSON.parse(
        fs.readFileSync(
          `./build/signature/${getCircuitNameFromPassportData(passportData, 'signature')}/${getCircuitNameFromPassportData(passportData, 'signature')}_vkey.json`
        ).toString()
      );

      // 4. Verify proof
      const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
      expect(verification).to.be.true;
    });
  });
});
