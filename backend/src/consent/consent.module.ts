import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Consent, ConsentSchema } from './schemas/consent.schema';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { AuthUserModule } from 'src/shared/guards/auth-user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Consent.name, schema: ConsentSchema }]),
    AuthUserModule,
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
