import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                uri: `${configService.get<string>('MONGODB_URI')}/prescripto`,
                onConnectionCreate: (connection) => {
                    connection.on('connected', () => console.log('Database Connected'));
                    return connection;
                }
            }),
            inject: [ConfigService],
        })
    ],
    exports: [MongooseModule],
})
export class DatabaseModule {}
