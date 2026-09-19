import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Consent, ConsentSchema } from './schemas/consent.schema';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: Consent.name, schema: ConsentSchema }])],
    controllers: [ConsentController],
    providers: [ConsentService],
    exports: [ConsentService],
})
export class ConsentModule { }
