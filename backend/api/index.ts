import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import * as express from 'express';

let cachedApp: express.Express;
let isInitializing = false;
let initPromise: Promise<express.Express> | null = null;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  // Prevent multiple simultaneous initializations
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('Initializing NestJS application...');
      const expressApp = express();
      const adapter = new ExpressAdapter(expressApp);
      
      const app = await NestFactory.create(AppModule, adapter, {
        logger: ['error', 'warn'],
      });

      // Enable CORS for frontend communication
      app.enableCors({
        origin: true, // Allow all origins on Vercel
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
      });

      await app.init();
      console.log('NestJS application initialized successfully');
      cachedApp = expressApp;
      isInitializing = false;
      return expressApp;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      console.error('Failed to initialize NestJS application:', error);
      throw error;
    }
  })();

  return initPromise;
}

export default async function handler(req: express.Request, res: express.Response) {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error('Error in Vercel handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });

    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      });
    }
  }
}

