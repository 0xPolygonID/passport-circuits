import { Controller, Get } from '@nestjs/common';
import { ProofService } from './proof.service';

@Controller('proof')
export class ProofController {
  constructor(private readonly userService: ProofService) {}

  @Get()
  async generateProof(): Promise<string> {
    return this.userService.generateProof();
  }
}
