import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AddDoctorDto } from './dto/add-doctor.dto';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }
    
    @Post('add-doctor')
    @ApiOperation({ summary: 'Add a new doctor to the system' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('image'))
    async addDoctor(
        @Body() body: AddDoctorDto,
        @UploadedFile() imageFile: Express.Multer.File,
    ) {
        return this.adminService.addDoctor(body, imageFile);
    }
}
