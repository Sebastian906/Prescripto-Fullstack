import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpecialitiesService } from './specialities.service';
import { SpecialitiesController } from './specialities.controller';
import { Speciality, SpecialitySchema } from './schemas/speciality.schema';
import { AuthAdminModule } from 'src/shared/guards/auth-admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Speciality.name, schema: SpecialitySchema },
    ]),
    AuthAdminModule,
  ],
  providers: [SpecialitiesService],
  controllers: [SpecialitiesController],
  exports: [SpecialitiesService],
})
export class SpecialitiesModule { }
