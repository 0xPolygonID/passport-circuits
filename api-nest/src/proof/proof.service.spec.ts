import { Test, TestingModule } from '@nestjs/testing';
import { ProofService } from './proof.service';

describe('ProofService', () => {
  let service: ProofService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProofService],
    }).compile();

    service = module.get<ProofService>(ProofService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
