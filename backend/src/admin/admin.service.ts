import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isEmail } from 'class-validator';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';
import { LoginAdminDto } from './dto/login-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        private readonly cloudinaryService: CloudinaryService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }
    
    async addDoctor(body: any, imageFile: Express.Multer.File) {
        const { name, email, password, speciality, degree, experience, about, fees, address } = body;

        // Verificar que llegaron todos los campos (equivalente al if de Express)
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            throw new BadRequestException('Missing details');
        }

        // Validar formato de email
        if (!isEmail(email)) {
            throw new BadRequestException('Please enter a valid email');
        }

        // Validar contraseña fuerte
        if (password.length < 8) {
            throw new BadRequestException('Please enter a stronger password (min 8 characters)');
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Subir imagen a Cloudinary
        const imageUpload = await this.cloudinaryService.uploadImage(imageFile);
        const imageUrl = imageUpload.secure_url;

        // Crear y guardar el doctor
        const newDoctor = new this.doctorModel({
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees: Number(fees),       
            address: JSON.parse(address),  
        });

        await newDoctor.save();

        return { success: true, message: 'Doctor added successfully' };
    }

    async loginAdmin(body: LoginAdminDto) {
        if (!body) {
            throw new BadRequestException('Request body is missing');
        }

        const { email, password } = body;

        const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
        const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

        if (email !== adminEmail || password !== adminPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign(email + password, {
            secret: this.configService.get<string>('JWT_SECRET'),
        });

        return { success: true, token };
    }
}
