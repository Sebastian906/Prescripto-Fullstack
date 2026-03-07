import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}
    
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
}
