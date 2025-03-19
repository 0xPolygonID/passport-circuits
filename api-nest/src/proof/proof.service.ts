import { Injectable } from '@nestjs/common';
import {
  CircuitId,
  FSCircuitStorage,
  witnessBuilder,
} from '@0xpolygonid/js-sdk';
import * as path from 'path';
import { groth16 } from 'snarkjs';
import { inputs } from './test_input';

@Injectable()
export class ProofService {
  private readonly _circuitStorage: FSCircuitStorage;
  constructor() {
    this._circuitStorage = new FSCircuitStorage({
      dirname: path.join(__dirname, '../circuits_data'),
    });
  }

  async generateProof(): Promise<string> {
    const proof = await this._generateProof();
    return JSON.stringify(proof);
  }

  private async _generateProof(): Promise<{ proof: any; pub_signals: any }> {
    const circuitId = 'signature_sha256_sha256_sha256_rsa_65537_4096';
    const circuitData = await this._circuitStorage.loadCircuitData(
      circuitId as CircuitId,
    );
    if (!circuitData.wasm) {
      throw new Error(`wasm file doesn't exist for circuit ${circuitId}`);
    }

    const witnessCalculator = await witnessBuilder(circuitData.wasm);

    const wtnsBytes: Uint8Array = await witnessCalculator.calculateWTNSBin(
      inputs,
      0,
    );

    if (!circuitData.provingKey) {
      throw new Error(`proving file doesn't exist for circuit ${circuitId}`);
    }
    const { proof, publicSignals } = await groth16.prove(
      circuitData.provingKey,
      wtnsBytes,
    );

    return {
      proof,
      pub_signals: publicSignals,
    };
  }
}
