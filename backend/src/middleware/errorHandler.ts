import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Log the full error to the console for developers
  console.error('[SERVER ERROR]', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Standard JSON error format
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'An unexpected system error occurred' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
}
