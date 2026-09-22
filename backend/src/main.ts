import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerExceptionFilter } from './shared/throttler/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ThrottlerExceptionFilter());
  // Strict allowlist: CORS_ORIGINS preferred, else FRONTEND_URL + ADMIN_URL (README names).
  // Unknown browser origins get no ACAO header (blocked). rawBody + pipes untouched.
  const rawList = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ([process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(
      Boolean,
    ) as string[]);
  const allowlist = rawList.map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, ok?: boolean) => void,
    ) => {
      if (!origin) return cb(null, true); // curl / healthchecks / non-browser
      return cb(null, allowlist.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'token',
      'atoken',
      'dtoken',
      'stripe-signature',
    ],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('Prescripto API')
    .setDescription('API documentation for Prescripto application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, () => console.log(`Server started on port ${port}`));
}
bootstrap();
