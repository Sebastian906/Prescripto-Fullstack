import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class RunMigrationDto {
    @ApiPropertyOptional({
        example: false,
        description: 'If true, drops all tables before recreating. WARNING: destroys existing PostgreSQL data.',
    })
    @IsOptional() @IsBoolean()
    dropAndRecreate?: boolean;

    @ApiPropertyOptional({
        example: ['users', 'doctors'],
        description: 'Specific collections to migrate. If omitted, migrates all.',
        isArray: true,
        type: String,
    })
    @IsOptional() @IsArray() @IsString({ each: true })
    collections?: string[];
}
