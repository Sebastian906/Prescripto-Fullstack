import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    async register(@Body() dto: RegisterUserDto) {
        return this.usersService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    async login(@Body() dto: LoginUserDto) {
        return this.usersService.login(dto);
    }
}
