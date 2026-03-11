import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginUserDto } from 'src/users/dto/login-user.dto';
import { RegisterUserDto } from 'src/users/dto/register-user.dto';
import { UsersService } from 'src/users/users.service';

@ApiTags('Authentication -- OAuth 2.0')
@Controller('api/auth')
export class AuthController {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService
    ) { }

    private redirectWithToken(res: Response, user: any): void {
        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL');
        const token = (user as { token: string }).token;
        res.redirect(`${frontendUrl}/oauth-callback?token=${token}`);
    }

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

    @Get('google')
    @ApiOperation({ summary: 'Initiate Google OAuth login' })
    @UseGuards(AuthGuard('google'))
    googleLogin(): void {
        // Passport redirects automatically — no body needed
    }

    @Get('google/callback')
    @ApiOperation({ summary: 'Google OAuth callback' })
    @UseGuards(AuthGuard('google'))
    googleCallback(@Req() req: Request, @Res() res: Response): void {
        this.redirectWithToken(res, req.user);
    }

    @Get('facebook')
    @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
    @UseGuards(AuthGuard('facebook'))
    facebookLogin(): void { }

    @Get('facebook/callback')
    @ApiOperation({ summary: 'Facebook OAuth callback' })
    @UseGuards(AuthGuard('facebook'))
    facebookCallback(@Req() req: Request, @Res() res: Response): void {
        this.redirectWithToken(res, req.user);
    }

    // @Get('microsoft')
    // @ApiOperation({ summary: 'Initiate Microsoft OAuth login' })
    // @UseGuards(AuthGuard('microsoft'))
    // microsoftLogin(): void { }

    // @Get('microsoft/callback')
    // @ApiOperation({ summary: 'Microsoft OAuth callback' })
    // @UseGuards(AuthGuard('microsoft'))
    // microsoftCallback(@Req() req: Request, @Res() res: Response): void {
    //     this.redirectWithToken(res, req.user);
    // }

    // @Get('twitter')
    // @ApiOperation({ summary: 'Initiate Twitter OAuth login' })
    // @UseGuards(AuthGuard('twitter'))
    // twitterLogin(): void { }

    // @Get('twitter/callback')
    // @ApiOperation({ summary: 'Twitter OAuth callback' })
    // @UseGuards(AuthGuard('twitter'))
    // twitterCallback(@Req() req: Request, @Res() res: Response): void {
    //     this.redirectWithToken(res, req.user);
    // }
}
