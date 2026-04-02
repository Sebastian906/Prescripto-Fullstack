import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SpecialitiesService } from './specialities.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { CreateSpecialityDto } from './dto/create-speciality.dto';
import { UpdateSpecialityDto } from './dto/update-speciality.dto';

@ApiTags('Specialities')
@Controller('api/specialities')
export class SpecialitiesController {
    constructor(private readonly specialitiesService: SpecialitiesService) { }

    @Get('tree')
    @ApiOperation({ summary: 'Get full speciality hierarchy tree (cached)' })
    async getTree() {
        return this.specialitiesService.getSpecialityTree();
    }

    @Get('names')
    @ApiOperation({ summary: 'Get flat list of active speciality names for form selects' })
    async getNames() {
        return this.specialitiesService.getSpecialityNames();
    }

    @Get('resolve/:slug')
    @ApiOperation({ summary: 'Resolve all descendant slugs for a given speciality' })
    async resolveSlugs(@Param('slug') slug: string) {
        const slugs = await this.specialitiesService.resolveSpecialitySlugs(slug);
        return { success: true, slugs };
    }

    @Post()
    @ApiOperation({ summary: 'Create a new speciality node (admin only)' })
    @ApiHeader({ name: 'atoken', required: true })
    @UseGuards(AuthAdminGuard)
    async create(@Body() dto: CreateSpecialityDto) {
        return this.specialitiesService.createSpeciality(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an existing speciality node (admin only)' })
    @ApiHeader({ name: 'atoken', required: true })
    @UseGuards(AuthAdminGuard)
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateSpecialityDto,
    ) {
        return this.specialitiesService.updateSpeciality(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Soft-delete a speciality node (admin only)' })
    @ApiHeader({ name: 'atoken', required: true })
    @UseGuards(AuthAdminGuard)
    async remove(@Param('id') id: string) {
        return this.specialitiesService.updateSpeciality(id, { active: false });
    }
}