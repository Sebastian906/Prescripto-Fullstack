import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AddDoctorDto } from './dto/add-doctor.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }
    
    @Post('add-doctor')
    @ApiOperation({ summary: 'Add a new doctor to the system' })
    @ApiConsumes('multipart/form-data')
    @ApiHeader({
        name: 'atoken',
        description: 'Admin authentication token',
        required: true,
    })
    @UseGuards(AuthAdminGuard)
    @UseInterceptors(FileInterceptor('image'))
    async addDoctor(
        @Body() body: AddDoctorDto,
        @UploadedFile() imageFile: Express.Multer.File,
    ) {
        return this.adminService.addDoctor(body, imageFile);
    }

    @Post('login')
    @ApiOperation({ summary: 'Admin login' })
    async loginAdmin(@Body() body: LoginAdminDto) {
        return this.adminService.loginAdmin(body);
    }
}
