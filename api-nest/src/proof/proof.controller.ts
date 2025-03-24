import { Controller, Get, Logger } from '@nestjs/common';
import { ProofService } from './proof.service';
import { genMockPassportData } from './utils/passports/genMockPassportData';
import { SignatureAlgorithm } from './utils/types';
import { ConfigService } from '@nestjs/config';

@Controller('proof')
export class ProofController {
  private readonly _isMockedPassportData: boolean;
  constructor(
    private readonly userService: ProofService,
    private configService: ConfigService,
  ) {
    this._isMockedPassportData =
      this.configService.get<boolean>('IS_MOCKED_PASSPORT');
  }

  @Get()
  async generateProof(): Promise<string> {
    let passportData;
    if (this._isMockedPassportData) {
      Logger.debug(`Generating mocked passport data`);
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

      passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101',
      );
    } else {
      passportData = {}; // todo: parse from body
    }

    return this.userService.generateProof(
      passportData,
      this._isMockedPassportData,
    );
  }
}
