import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  // Enable CORS for development
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Event Service API')
    .setDescription('API for managing events and notifications')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your admin token',
        in: 'header',
      },
      'admin-token', // This name here is important for matching up with @ApiBearerAuth() in your controllers.
    )
    .addTag('Events', 'Event management endpoints')
    .addTag('Public Events', 'Public event access endpoints')
    .addTag('Summary', 'Event summary streaming endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port ?? 3000);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  Logger.log(`📝 Environment: ${nodeEnv}`, 'Bootstrap');
  Logger.log(`🏥 Health check: http://localhost:${port}/health`, 'Bootstrap');
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
  Logger.log(
    `📋 Postman collection: http://localhost:${port}/api/docs-json`,
    'Bootstrap',
  );
}

void bootstrap();
