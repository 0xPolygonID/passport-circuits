import { Controller, Get } from '@nestjs/common';
import { ProofService } from './proof.service';
import { genMockPassportData } from './utils/passports/genMockPassportData';
import { SignatureAlgorithm } from './utils/types';

@Controller('proof')
export class ProofController {
  constructor(private readonly userService: ProofService) {}

  @Get()
  async generateProof(): Promise<string> {
    // TODO: parse passport data from from request
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

    return this.userService.generateProof(passportData);
  }
}
