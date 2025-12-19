import { Request, Response, NextFunction } from 'express';

export function pagination(req: Request, res: Response, next: NextFunction) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200); // Ceiling at 200
  const offset = (page - 1) * limit;

  (req as any).pagination = { limit, offset, page };
  next();
}
