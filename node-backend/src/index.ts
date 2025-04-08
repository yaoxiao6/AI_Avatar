// node-backend/src/index.ts
import express, { Express, Request, Response } from 'express';
import { createYoga } from 'graphql-yoga';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import schema from './schema';
import config from './config';
import logger from './utils/logger';
import firebaseService from './services/firebase';

// Set up error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Create Express server
const app: Express = express();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Check if the file is a PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Request logging middleware using morgan and winston
app.use(morgan('combined', { stream: (logger as any).stream }));
app.use(express.json());

logger.info('Starting server...');

// Create GraphQL Yoga instance with explicit typing
const yoga = createYoga({
  schema: schema as any, // Using 'as any' to bypass type checking issues with context
  graphiql: true,
  context: ({ request }) => {
    logger.debug('Processing GraphQL request', {
      path: request.url,
      operation: (request.body as any)?.operationName
    });
    return { request, logger };
  },
  cors: true,
  multipart: true
});

logger.info('GraphQL Yoga instance created');

// GraphQL endpoint
app.use('/graphql', yoga);

// PDF ingestion endpoint
app.post('/api/ingest', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    logger.info('Processing PDF ingestion request');
    
    // Check if file was provided
    if (!req.file) {
      logger.warn('No PDF file provided for ingestion');
      res.status(400).json({
        status: 'error',
        message: 'No PDF file provided'
      });
      return;
    }
    
    // Get filename and buffer
    const filename = req.file.originalname || 'unnamed.pdf';
    const pdfBuffer = req.file.buffer;
    
    logger.info('Starting PDF ingestion', { 
      filename, 
      fileSize: pdfBuffer.length 
    });
    
    // Process the PDF with Firebase service
    const result = await firebaseService.ingestPdf(pdfBuffer, filename);
    
    const duration = Date.now() - startTime;
    logger.info('PDF ingestion completed', {
      filename,
      chunksAdded: result.count,
      duration
    });
    
    res.status(200).json({
      status: 'success',
      message: `Successfully processed ${filename}`,
      count: result.count
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error processing PDF ingestion', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: err.message || 'Error processing PDF file'
    });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Server is running'
  });
});

// Start server
try {
  app.listen(config.PORT, () => {
    logger.info(`
🚀 Server is running!
📭 GraphQL endpoint: http://localhost:${config.PORT}/graphql
🛠️ GraphiQL interface: http://localhost:${config.PORT}/graphql
📄 PDF ingestion endpoint: http://localhost:${config.PORT}/api/ingest
🩺 Health check endpoint: http://localhost:${config.PORT}/health
    `);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}