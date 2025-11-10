import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  const allowedOrigins = [
    'https://ethindexer.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:3001',
  ];
  
  // Add FRONTEND_URL from environment if provided
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // In development, allow all origins for easier testing
  const corsOptions = {
    origin: process.env.NODE_ENV === 'development' 
      ? true 
      : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  };
  
  app.enableCors(corsOptions);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
}

bootstrap();