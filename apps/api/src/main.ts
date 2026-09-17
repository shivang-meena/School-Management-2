import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // CORS: Allow mobile and web client
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',').map((value) => value.trim());
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('School ERP API')
    .setDescription('NestJS v11 backend API for Arihant Public School ERP')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and user session management')
    .addTag('students', 'Student records, admission, and class rosters')
    .addTag('staff', 'Teacher and staff management and salary calculation')
    .addTag('attendance', 'Daily student and staff attendance tracking')
    .addTag('fees', 'Fee structures, invoices, and payment receipts')
    .addTag('exams', 'Exam schedules, marks entry, and report cards')
    .addTag('notices', 'Role-filtered announcements and notice board')
    .addTag('accounts', 'School income and expenditure accounts ledger')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 School ERP API is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
