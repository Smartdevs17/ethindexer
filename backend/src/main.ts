import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 EthIndexer backend running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Indexer endpoints:`);
  console.log(`   - Stats: http://localhost:${port}/indexer/stats`);
  console.log(`   - Latest block: http://localhost:${port}/indexer/latest-block`);
  console.log(`   - Initialize tokens: POST http://localhost:${port}/indexer/initialize-popular-tokens`);
  console.log(`   - Index hot data: POST http://localhost:${port}/indexer/index-hot-data`);
  console.log(`   - Index token: POST http://localhost:${port}/indexer/index-token`);
}

bootstrap();