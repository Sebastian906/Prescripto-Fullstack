import { Body, Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MigrationReport, MigrationService } from './migration.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { RunMigrationDto } from './dto/run-migration.dto';

@ApiTags('Migration')
@Controller('api/migration')
export class MigrationController {
    private readonly logger = new Logger(MigrationController.name);

    constructor(private readonly migrationService: MigrationService) { }

    @Get('status')
    @ApiOperation({ summary: 'Check PostgreSQL connection and table counts' })
    async getStatus() {
        return this.migrationService.getStatus();
    }

    @Post('schema')
    @ApiOperation({ summary: 'Create PostgreSQL schema (DDL). Admin only.' })
    @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
    @UseGuards(AuthAdminGuard)
    async createSchema(@Query('drop') drop?: string) {
        const dropAndRecreate = drop === 'true';
        await this.migrationService.ensureSchema(dropAndRecreate);
        return {
            success: true,
            message: dropAndRecreate
                ? 'Schema dropped and recreated'
                : 'Schema created / verified',
        };
    }

    @Post('run')
    @ApiOperation({ summary: 'Run MongoDB → PostgreSQL migration. Admin only.' })
    @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
    @UseGuards(AuthAdminGuard)
    async runMigration(@Body() dto: RunMigrationDto = {}): Promise<MigrationReport> {
        this.logger.log('Migration triggered via API');
        return this.migrationService.runFullMigration({
            dropAndRecreate: dto.dropAndRecreate ?? false,
            collections: dto.collections,
        });
    }

    @Post('collection')
    @ApiOperation({ summary: 'Migrate a single collection. Admin only.' })
    @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
    @ApiQuery({ name: 'name', required: true, description: 'Collection name: users | specialities | doctors | slots | appointments | monthly_stats | password_reset_tokens | conversations' })
    @UseGuards(AuthAdminGuard)
    async migrateOne(@Query('name') name: string) {
        this.logger.log(`Single-collection migration triggered: ${name}`);
        const result = await this.migrationService.migrateCollection(name);
        return { success: result.errors === 0, result };
    }
}
