import { Body, Controller, Get, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileUserDto } from './dto/update-profile.dto';

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

    @Put('update-profile')
    @ApiOperation({ summary: 'Update authenticated user profile' })
    @ApiConsumes('multipart/form-data')
    @ApiHeader({
        name: 'token',
        description: 'User JWT authentication token',
        required: true,
    })
    @UseGuards(AuthUserGuard)
    @UseInterceptors(FileInterceptor('image'))
    async updateProfile(
        @Req() req: Request,
        @Body() dto: UpdateProfileUserDto,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        const userId = (req as any).userId as string;
        return this.usersService.updateProfile(userId, dto, imageFile);
    }
}
