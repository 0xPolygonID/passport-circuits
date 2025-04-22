import dotenv from 'dotenv';
import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsSignature } from '../../utils/circuits/generateInputs';
import { genMockPassportData } from '../../utils/passports/genMockPassportData';
import { SignatureAlgorithm } from '../../utils/types';
import { getCircuitNameFromPassportData } from '../../utils/circuits/circuitsName';
import { sigAlgs, fullSigAlgs } from './test_cases';
import { generateLinkId, generateNullifier } from '../../utils/passports/passport';
import { PASSPORT_ATTESTATION_ID } from '../../utils/constants/constants';
import { parseCertificateSimple } from '../../utils/certificate_parsing/parseCertificateSimple';
import serialized_dsc_tree from '../../utils/pubkeys/serialized_dsc_tree.json';
import { Poseidon } from '@iden3/js-crypto';
dotenv.config();

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;

console.log('Running tests for signature circuit');

testSuite.forEach(
  ({ dgHashAlgo, eContentHashAlgo, sigAlg, hashFunction, domainParameter, keyLength }) => {
    describe(`Signature Dsc - ${dgHashAlgo.toUpperCase()} ${eContentHashAlgo.toUpperCase()} ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${
      domainParameter
    } ${keyLength}`, function () {
      this.timeout(0);
      let circuit: any;

      const lastName = 'KUZNETSOV';
      const firstName = 'VALERIY';
      const passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
        'UKR',
        '960309',
        '350803',
        'AC1234567',
        lastName,
        firstName
      );

      const nullifierNonce = 1;
      const inputs = generateCircuitInputsSignature(
        passportData,
        serialized_dsc_tree as string,
        nullifierNonce
      );

      before(async () => {
        circuit = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/signature/instances/${getCircuitNameFromPassportData(passportData, 'signature')}.circom`
          ),
          {
            include: [
              'node_modules',
              './node_modules/@zk-kit/binary-merkle-root.circom/src',
              './node_modules/circomlib/circuits',
            ],
          }
        );
      });

      it('should compile and load the circuit', async function () {
        expect(circuit).to.not.be.undefined;
      });

      it('should calculate the witness with correct inputs, and have the right nullifier', async function () {
        const w = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(w);

        const nullifier_js = generateNullifier(passportData, nullifierNonce);
        console.log('\x1b[35m%s\x1b[0m', 'js: nullifier:', nullifier_js);
        const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
        console.log('\x1b[34m%s\x1b[0m', 'circom: nullifier', nullifier);
        expect(nullifier).to.be.equal(nullifier_js);

        const linkId_js = generateLinkId(passportData, inputs.linkNonce[0]);
        console.log('\x1b[35m%s\x1b[0m', 'js: linkId:', linkId_js);
        const linkId = (await circuit.getOutput(w, ['linkId'])).linkId;
        console.log('\x1b[34m%s\x1b[0m', 'circom linkId', linkId);
        expect(linkId).to.be.equal(linkId_js);
      });

      it('should fail if dsc_pubKey_actual_size is lower than the minimum key length', async () => {
        try {
          const dscParsed = parseCertificateSimple(passportData.dsc);

          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          if (dscParsed.signatureAlgorithm === 'rsa') {
            tamperedInputs.dsc_pubKey_actual_size = (256 - 1).toString(); // 256 is the minimum key length for RSA
          } else {
            // for ecdsa and rsapss, the minimum key length is fixed for each circuit
            tamperedInputs.dsc_pubKey_actual_size = (
              Number(tamperedInputs.dsc_pubKey_actual_size) - 1
            ).toString();
          }

          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Tests for dsc_pubKey offset and size checks -----
      it('should fail if dsc_pubKey_offset + dsc_pubKey_actual_size > raw_dsc_actual_length', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.dsc_pubKey_offset = (
            Number(tamperedInputs.raw_dsc_actual_length) -
            Number(tamperedInputs.dsc_pubKey_actual_size) +
            1
          ).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if dsc_pubKey_actual_size is larger than the actual key size in certificate', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.dsc_pubKey_actual_size = (
            Number(tamperedInputs.dsc_pubKey_actual_size) + 8
          ).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Tests for Merkle tree inclusion -----
      it('should fail if merkle_root is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.merkle_root = (BigInt(tamperedInputs.merkle_root) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if leaf_depth is tampered', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          // Change leaf_depth to an incorrect value (e.g., add 1)
          tamperedInputs.leaf_depth = (Number(tamperedInputs.leaf_depth) + 1).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if a value in the merkle path is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.path[0] = (BigInt(tamperedInputs.path[0]) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if a sibling in the merkle proof is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.siblings[0] = (BigInt(tamperedInputs.siblings[0]) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail to calculate witness with invalid eContent', async function () {
        try {
          const ininputs = {
            ...inputs,
            eContent: inputs.eContent.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
          };
          await circuit.calculateWitness(ininputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if signed_attr is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.signed_attr = tamperedInputs.signed_attr.map((byte: string) =>
            ((parseInt(byte, 10) + 1) % 256).toString()
          );
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if signature_passport is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.signature_passport = tamperedInputs.signature_passport.map(
            (byte: string) => ((parseInt(byte, 10) + 1) % 256).toString()
          );
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Test for tampering with csca_hash (used in commitment) -----
      it('should fail if csca_hash is tampered', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.csca_tree_leaf = (BigInt(tamperedInputs.csca_tree_leaf) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      if (sigAlg.startsWith('rsa') || sigAlg.startsWith('rsapss')) {
        it('should fail if RSA public key prefix is invalid', async function () {
          const invalidPrefixes = [
            [0x03, 0x82, 0x01, 0x01, 0x00],
            [0x02, 0x83, 0x01, 0x01, 0x00],
            [0x02, 0x82, 0x02, 0x02, 0x00],
          ];

          for (const invalidPrefix of invalidPrefixes) {
            try {
              const tamperedInputs = JSON.parse(JSON.stringify(inputs));
              for (let i = 0; i < invalidPrefix.length; i++) {
                tamperedInputs.raw_dsc[
                  Number(tamperedInputs.dsc_pubKey_offset) - invalidPrefix.length + i
                ] = invalidPrefix[i].toString();
              }

              await circuit.calculateWitness(tamperedInputs);
              expect.fail('Expected an error but none was thrown.');
            } catch (error: any) {
              expect(error.message).to.include('Assert Failed');
            }
          }
        });

        it('should pass with valid RSA prefix for the key length', async function () {
          const keyLengthToPrefix = {
            2048: [0x02, 0x82, 0x01, 0x01, 0x00],
            3072: [0x02, 0x82, 0x01, 0x81, 0x00],
            4096: [0x02, 0x82, 0x02, 0x01, 0x00],
          };

          const expectedPrefix = keyLengthToPrefix[keyLength];

          for (let i = 0; i < 5; i++) {
            const prefixByte = parseInt(inputs.raw_dsc[Number(inputs.dsc_pubKey_offset) - 5 + i]);
            expect(prefixByte).to.equal(
              expectedPrefix[i],
              `Prefix byte ${i} mismatch for ${keyLength} bit key`
            );
          }
        });
      }

      it('should fail if raw_dsc has a signal that is longer than a byte', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.raw_dsc[0] = (parseInt(tamperedInputs.raw_dsc[0], 10) + 256).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });
    });
  }
);
