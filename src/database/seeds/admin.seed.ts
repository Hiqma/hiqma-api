import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

export async function seedAdminUser(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hiqma.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  
  const existingAdmin = await userRepository.findOne({ 
    where: { email: adminEmail } 
  });
  
  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }
  
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = userRepository.create({
    email: adminEmail,
    password: hashedPassword,
    name: adminName,
    role: 'super_admin',
    country: 'Kenya',
    continent: 'Africa',
  });
  
  await userRepository.save(admin);
  console.log(`Admin user created: ${adminEmail}`);
}
