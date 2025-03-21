import { Injectable, Logger } from '@nestjs/common';
import {
  CircuitId,
  FSCircuitStorage,
  NativeProver,
  byteEncoder,
} from '@0xpolygonid/js-sdk';
import * as path from 'path';
import { PassportData } from './utils/types';
import serialized_dsc_tree from './utils/pubkeys/serialized_dsc_tree.json';
import { poseidon6 } from 'poseidon-lite';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsSignature,
} from './utils/circuits/generateInputs';
import serialized_csca_tree from './utils/pubkeys/serialized_csca_tree.json';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import hubAbi from '../contracts_abi/hub.json';
import registryAbi from '../contracts_abi/registry.json';
import { getCircuitNameFromPassportData } from './utils/circuits/circuitsName';

@Injectable()
export class ProofService {
  private readonly _prover: NativeProver;
  private readonly _rpcProvider: ethers.JsonRpcProvider;
  private readonly _hubContract: ethers.Contract;
  private readonly _registryContract: ethers.Contract;

  constructor(private configService: ConfigService) {
    const circuitStorage = new FSCircuitStorage({
      dirname: path.join(__dirname, '../circuits_data'),
    });
    this._prover = new NativeProver(circuitStorage);

    const rpcURL = this.configService.get<string>('RPC_URL');
    if (!rpcURL) {
      throw new Error('provide RPC_URL');
    }
    this._rpcProvider = new ethers.JsonRpcProvider(rpcURL);

    const hubAddress = this.configService.get<string>('HUB_ADDRESS');
    if (!hubAddress) {
      throw new Error('provide HUB_ADDRESS');
    }
    this._hubContract = new ethers.Contract(
      hubAddress,
      hubAbi,
      this._rpcProvider,
    );
    const registryAddress = this.configService.get<string>('REGISTRY_ADDRESS');
    if (!registryAddress) {
      throw new Error('provide REGISTRY_ADDRESS');
    }
    this._registryContract = this._hubContract = new ethers.Contract(
      registryAddress,
      registryAbi,
      this._rpcProvider,
    );
  }

  async generateProof(passportData: PassportData): Promise<string> {
    // 1. verify DSC signature:
    await this._verifyDSC(passportData);
    // 2. generate Signature proof:
    const secret = poseidon6(
      'SECRET'.split('').map((x) => BigInt(x.charCodeAt(0))),
    ).toString();

    const inputs = generateCircuitInputsSignature(
      secret,
      passportData,
      serialized_dsc_tree as string,
    );

    const circuitId = getCircuitNameFromPassportData(passportData, 'signature');
    Logger.debug(`Generating proof for Signature circuit: ${circuitId}`);
    const proof = await this._generateProof(inputs, circuitId);
    return JSON.stringify(proof);
  }

  private async _verifyDSC(passportData: PassportData) {
    const inputs = generateCircuitInputsDSC(
      passportData.dsc,
      serialized_csca_tree,
    );

    const dscRoot = inputs.merkle_root;
    const isRegistered = await this._isDscRegistered(dscRoot);
    if (isRegistered) {
      return;
    }
    const circuitId = getCircuitNameFromPassportData(passportData, 'dsc');
    Logger.debug(`Generating proof for DSC circuit: ${circuitId}`);
    const proof = await this._generateProof(
      inputs as unknown as { [x: string]: string[] },
      circuitId,
    );
    console.log(proof);
    // TODO: send proof to `registerDscKeyCommitment` Hub SC
  }

  private async _isDscRegistered(root: string): Promise<boolean> {
    return (await this._registryContract.isRegisteredDscKeyCommitment(
      root,
    )) as boolean;
  }

  private async _generateProof(
    inputs: {
      [x: string]: string[];
    },
    circuitId: string,
  ): Promise<{ proof: any; pub_signals: any }> {
    const inputsBytes = byteEncoder.encode(JSON.stringify(inputs));
    return this._prover.generate(inputsBytes, circuitId as CircuitId);
  }
}
