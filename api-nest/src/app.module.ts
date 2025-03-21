import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProofModule } from './proof/proof.module';

@Module({
  imports: [ProofModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
