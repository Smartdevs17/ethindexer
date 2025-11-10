import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

class SocketIOAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
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
    
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? true 
          : allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });
    
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure Socket.IO adapter with CORS
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
  
  // Enable CORS for frontend communication
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
  
  // Configure Socket.IO adapter with CORS (after CORS is enabled)
  app.useWebSocketAdapter(new SocketIOAdapter(app));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket namespace available at: /indexer`);
  console.log(`🔌 Socket.IO base path: /socket.io/`);
}

bootstrap();