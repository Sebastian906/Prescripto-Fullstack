import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // Private helpers
    private signToken(userId: string): string {
        return this.jwtService.sign(
            { id: userId },
            { secret: this.configService.get<string>('JWT_SECRET') },
        );
    }

    // Local auth methods
    async register(dto: RegisterUserDto): Promise<{ success: boolean; token: string }> {
        const { name, email, password } = dto;

        if (!name || !email || !password) {
            throw new BadRequestException('Missing details');
        }

        if (!isEmail(email)) {
            throw new BadRequestException('Enter a valid email');
        }

        if (password.length < 8) {
            throw new BadRequestException('Enter a stronger password (min 8 characters)');
        }

        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new BadRequestException('Email already registered');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new this.userModel({
            name,
            email,
            password: hashedPassword,
        });

        const savedUser = await newUser.save();

        const token = this.jwtService.sign(
            { id: savedUser._id },
            { secret: this.configService.get<string>('JWT_SECRET') },
        );

        return { success: true, token };
    } 

    async login(dto: LoginUserDto): Promise<{ success: boolean; token: string }> {
        const { email, password } = dto;

        const user = await this.userModel.findOne({ email });

        if (!user) {
            throw new UnauthorizedException('User does not exist');
        }

        // If login method is OAuth, password will be empty
        if (!user.password) {
            throw new UnauthorizedException(
                'This account uses social login. Please sign in with your social provider.',
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return { success: true, token: this.signToken(user._id.toString()) };
    }

    async loginOAuth(profile: {
        name: string;
        email: string;
        image?: string;
        provider: string;
    }): Promise<{ success: boolean; token: string }> {
        const { name, email, image } = profile;

        let user = await this.userModel.findOne({ email });

        if (!user) {
            user = await this.userModel.create({
                name,
                email,
                image: image ?? '',
            });
        }

        return { success: true, token: this.signToken(user._id.toString()) };
    }
}
