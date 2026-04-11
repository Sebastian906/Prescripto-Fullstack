import { ApiPropertyOptional } from "@nestjs/swagger";

export class RunMigrationDto {
    @ApiPropertyOptional({
        example: false,
        description: 'If true, drops all tables before recreating. WARNING: destroys existing PostgreSQL data.',
    })
    dropAndRecreate?: boolean;

    @ApiPropertyOptional({
        example: ['users', 'doctors'],
        description: 'Specific collections to migrate. If omitted, migrates all.',
        isArray: true,
        type: String,
    })
    collections?: string[];
}
