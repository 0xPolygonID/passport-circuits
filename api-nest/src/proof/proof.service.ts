import { Injectable } from '@nestjs/common';
import {
  CircuitId,
  FSCircuitStorage,
  NativeProver,
  byteEncoder,
} from '@0xpolygonid/js-sdk';
import * as path from 'path';
import { genMockPassportData } from './utils/passports/genMockPassportData';
import { SignatureAlgorithm } from './utils/types';
import serialized_dsc_tree from './utils/pubkeys/serialized_dsc_tree.json';
import { poseidon6 } from 'poseidon-lite';
import { generateCircuitInputsSignature } from './utils/circuits/generateInputs';

@Injectable()
export class ProofService {
  private readonly _prover: NativeProver;
  constructor() {
    const circuitStorage = new FSCircuitStorage({
      dirname: path.join(__dirname, '../circuits_data'),
    });
    this._prover = new NativeProver(circuitStorage);
  }

  async generateProof(): Promise<string> {
    const sigAlgs = {
      dgHashAlgo: 'sha256',
      eContentHashAlgo: 'sha256',
      hashFunction: 'sha256',
      sigAlg: 'rsa',
      domainParameter: '65537',
      keyLength: '2048',
    };

    const {
      dgHashAlgo,
      eContentHashAlgo,
      hashFunction,
      sigAlg,
      domainParameter,
      keyLength,
    } = sigAlgs;

    const passportData = genMockPassportData(
      dgHashAlgo,
      eContentHashAlgo,
      `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
      'FRA',
      '000101',
      '300101',
    );

    const secret = poseidon6(
      'SECRET'.split('').map((x) => BigInt(x.charCodeAt(0))),
    ).toString();

    const inputs = generateCircuitInputsSignature(
      secret,
      passportData,
      serialized_dsc_tree as string,
    );

    const proof = await this._generateProof(inputs);
    return JSON.stringify(proof);
  }

  private async _generateProof(inputs: {
    [x: string]: string[];
  }): Promise<{ proof: any; pub_signals: any }> {
    const circuitId = 'signature_sha256_sha256_sha256_rsa_65537_4096';
    const inputsBytes = byteEncoder.encode(JSON.stringify(inputs));
    return this._prover.generate(inputsBytes, circuitId as CircuitId);
  }
}
