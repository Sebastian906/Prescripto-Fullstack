import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { UpsertConsentDto } from './dto/upsert-consent.dto';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';

@ApiTags('Consents')
@Controller('api/consents')
export class ConsentController {
    constructor(private readonly consents: ConsentService) { }

    @Post()
    @ApiOperation({ summary: 'Create or update my consent' })
    @ApiHeader({ name: 'token', description: 'User JWT authentication token', required: true })
    @UseGuards(AuthUserGuard)
    upsert(@Req() req: Request, @Body() dto: UpsertConsentDto) {
        return this.consents.upsert((req as any).userId as string, dto);
    }

    @Get('mine')
    @ApiOperation({ summary: 'List my consents' })
    @ApiHeader({ name: 'token', description: 'User JWT authentication token', required: true })
    @UseGuards(AuthUserGuard)
    mine(@Req() req: Request) {
        return this.consents.mine((req as any).userId as string);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Read one of my consents' })
    @ApiHeader({ name: 'token', description: 'User JWT authentication token', required: true })
    @UseGuards(AuthUserGuard)
    getOne(@Req() req: Request, @Param('id') id: string) {
        return this.consents.getOwned((req as any).userId as string, id);
    }
}
