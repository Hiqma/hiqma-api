import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'avatarUrl', 'createdAt'],
    });
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    await this.userRepository.update(userId, updateProfileDto);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedNewPassword });
    
    return { message: 'Password changed successfully' };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, file.buffer);
    
    const avatarUrl = `/uploads/avatars/${fileName}`;
    await this.userRepository.update(userId, { avatarUrl });
    
    return { avatarUrl };
  }
}