import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordResetToken, PasswordResetTokenDocument } from './password-reset-token.schema';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { DirectResetPasswordDto } from './dto/direct-reset-password.dto';

@Injectable()
export class PasswordResetService {
    constructor(
        @InjectModel(PasswordResetToken.name) private readonly tokenModel: Model<PasswordResetTokenDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        private readonly configService: ConfigService
    ) { }
    
    private async findAccount(
        email: string,
        role: string,
    ): Promise<{ id: string; email: string } | null> {
        if (role === 'user') {
            const user = await this.userModel.findOne({ email }).lean();
            if (!user) return null;
            
            if (!user.password) return null;
            return { id: String(user._id), email: user.email };
        }
        if (role === 'doctor') {
            const doctor = await this.doctorModel.findOne({ email }).lean();
            if (!doctor) return null;
            return { id: String(doctor._id), email: doctor.email };
        }
        if (role === 'admin') {
            const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
            if (email !== adminEmail) return null;
            return { id: 'admin', email };
        }
        return null;
    }

    private async sendResetEmail(
        toEmail: string,
        rawToken: string,
        role: string,
    ): Promise<void> {
        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL');
        const adminUrl = this.configService.get<string>('VITE_ADMIN_URL') ?? frontendUrl;

        const baseUrl = role === 'user' ? frontendUrl : adminUrl;
        const resetLink = `${baseUrl}/reset-password?token=${rawToken}&role=${role}`;

        const transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
            secure: false,
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });

        await transporter.sendMail({
            from: `"Prescripto" <${this.configService.get<string>('EMAIL_FROM')}>`,
            to: toEmail,
            subject: 'Reset your password – Prescripto',
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
                    <h2 style="color:#6366f1">Password Reset</h2>
                    <p>We received a request to reset the password for your Prescripto account.</p>
                    <p>Click the button below to set a new password. This link expires in <strong>10 minutes</strong>.</p>
                    <a href="${resetLink}"
                        style="display:inline-block;margin:16px 0;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                        Reset Password
                    </a>
                    <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
                    <p style="color:#aaa;font-size:11px;word-break:break-all">Or copy this link: ${resetLink}</p>
                </div>
            `,
        });
    }

    async requestReset(dto: RequestPasswordResetDto): Promise<{ success: boolean; message: string }> {
        const { email, role } = dto;

        const account = await this.findAccount(email, role);

        const safeMessage = 'If an account with that email exists, you will receive a reset link shortly.';

        if (!account) {
            return { success: true, message: safeMessage };
        }

        await this.tokenModel.updateMany(
            { userId: account.id, role, used: false },
            { used: true },
        );

        // Generate a cryptographically random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await this.tokenModel.create({
            userId: account.id,
            role,
            tokenHash,
            expiresAt,
            used: false,
        });

        await this.sendResetEmail(account.email, rawToken, role);

        return { success: true, message: safeMessage };
    }

    async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
        const { token: rawToken, newPassword } = dto;

        if (!newPassword || newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const record = await this.tokenModel.findOne({ tokenHash });

        if (!record) {
            throw new NotFoundException('Invalid or expired reset link');
        }

        if (record.used) {
            throw new BadRequestException('This reset link has already been used');
        }

        if (record.expiresAt < new Date()) {
            throw new BadRequestException('This reset link has expired');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (record.role === 'user') {
            await this.userModel.findByIdAndUpdate(record.userId, { password: hashedPassword });
        } else if (record.role === 'doctor') {
            await this.doctorModel.findByIdAndUpdate(record.userId, { password: hashedPassword });
        } else if (record.role === 'admin') {
            // Admin credentials live in env — cannot be reset via DB
            throw new BadRequestException('Admin password cannot be reset this way');
        }

        await this.tokenModel.findByIdAndUpdate(record._id, { used: true });

        return { success: true, message: 'Your password has been updated successfully.' };
    }

    async directReset(dto: DirectResetPasswordDto): Promise<{ success: boolean; message: string }> {
        const { email, role, newPassword } = dto;

        if (!newPassword || newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        if (role === 'doctor') {
            const doctor = await this.doctorModel.findOne({ email }).lean();
            if (!doctor) {
                throw new NotFoundException('No doctor account found with that email');
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await this.doctorModel.findByIdAndUpdate(String(doctor._id), { password: hashedPassword });
            return { success: true, message: 'Password updated successfully.' };
        }

        if (role === 'admin') {
            const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
            if (email !== adminEmail) {
                throw new NotFoundException('No admin account found with that email');
            }
            throw new BadRequestException(
                'Admin credentials cannot be changed through this panel.',
            );
        }

        throw new BadRequestException('Invalid role for direct reset');
    }
}
