import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedAdminUser } from './database/seeds/admin.seed';
import { seedCategories } from './database/seeds/categories.seed';
import { seedAgeGroups } from './database/seeds/age-groups.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const dataSource = app.get(DataSource);
  await seedAdminUser(dataSource);
  await seedCategories(dataSource);
  await seedAgeGroups(dataSource);
  
  const config = new DocumentBuilder()
    .setTitle('Hiqma Cloud API')
    .setDescription('African Edge-Learning Hub Cloud API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Hiqma API Docs - Swagger UI',
  });
  
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://api.hiqma.org', 'https://dashboard.hiqma.org', 'https://edgehub.hiqma.org'],
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
