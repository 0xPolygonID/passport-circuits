import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';
import { generateCircuitInputsSignature } from '../../../utils/circuits/generateInputs';
import { fullSigAlgs, sigAlgs } from './test_cases';
import { genMockPassportData } from '../../../utils/passports/genMockPassportData';
import { SignatureAlgorithm } from '../../../utils/types';
import { getCircuitNameFromPassportData } from '../../../utils/circuits/circuitsName';
import serialized_dsc_tree from '../../../utils/pubkeys/serialized_dsc_tree.json';
import * as snarkjs from 'snarkjs';
import { exec } from 'child_process';
import { Poseidon } from '@iden3/js-crypto';
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

testSuite.forEach(
  ({ dgHashAlgo, eContentHashAlgo, sigAlg, hashFunction, domainParameter, keyLength }) => {
    const passportData = genMockPassportData(
      hashFunction,
      hashFunction,
      `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
      'FRA',
      '000101',
      '300101'
    );

    describe(`Signature Dsc - ${dgHashAlgo.toUpperCase()} ${eContentHashAlgo.toUpperCase()} ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${
      domainParameter
    } ${keyLength}`, function () {
      this.timeout(0);
      let witness_calculator;
      let circuitName;

      const inputs = generateCircuitInputsSignature(
        passportData,
        serialized_dsc_tree as string,
        1,
      );

      before(async () => {
        circuitName = getCircuitNameFromPassportData(passportData, 'signature');
        witness_calculator = `./package/signature/${circuitName}/bin/${circuitName}`;
      });

      it('should find the witness calculator', async function () {
        expect(fs.existsSync(witness_calculator)).to.be.true;
      });

      it('should compute a valid witness, generate proof and verify it', async () => {
        // 1. Generate input.json
        fs.writeFileSync(
          `./package/signature/${circuitName}/bin/input.json`,
          JSON.stringify(inputs, null, 2)
        );
        let start = performance.now();
        // 2. Generate witness
        try {
          await execute(
            `./package/signature/${circuitName}/bin/${circuitName} ./package/signature/${circuitName}/bin/input.json ./package/signature/${circuitName}/bin/output.wtns`
          );
        } catch (error) {
          console.log('error!!!', error);
          // if the promise rejects, we land here
        }
        let stop = performance.now();
        let timeElapsed = stop - start;
        console.log('Time witness generation: ', timeElapsed);

        start = performance.now();
        // 3. Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.prove(
          `./build/signature/${circuitName}/${circuitName}_final.zkey`,
          `./package/signature/${circuitName}/bin/output.wtns`
        );
        stop = performance.now();
        timeElapsed = stop - start;
        console.log('Time proof generation (snarkjs): ', timeElapsed);

        start = performance.now();
        // 4. Generate proof (rapidsnark)
        try {
          await execute(
            `./rapidsnark/prover ./build/signature/${circuitName}/${circuitName}_final.zkey ./package/signature/${circuitName}/bin/output.wtns ./package/signature/${circuitName}/bin/proof.json ./package/signature/${circuitName}/bin/public.json`
          );
        } catch (error) {
          console.log('error!!!', error);
          // if the promise rejects, we land here
        }
        stop = performance.now();
        timeElapsed = stop - start;
        console.log('Time proof generation (rapidsnark): ', timeElapsed);

        const vkey = JSON.parse(
          fs.readFileSync(`./build/signature/${circuitName}/${circuitName}_vkey.json`).toString()
        );

        start = performance.now();
        // 5. Verify proof
        const verification = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        expect(verification).to.be.true;
        stop = performance.now();
        timeElapsed = stop - start;
        console.log('Time verification: ', timeElapsed);
      });
    });
  }
);
