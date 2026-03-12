import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('get-profile')
    @ApiOperation({ summary: 'Get authenticated user profile' })
    @ApiHeader({
        name: 'token',
        description: 'User JWT authentication token',
        required: true,
    })
    @UseGuards(AuthUserGuard)
    async getProfile(@Req() req: Request) {
        const userId = (req as any).userId as string;
        return this.usersService.getProfile(userId);
    }
}
