import { Request, Response, NextFunction } from 'express';

const ROLE_RANKING: Record<string, number> = {
  'user': 1,
  'manager': 2,
  'admin': 3,
  'staff': 1 // Alias for backward compatibility if any
};

export function requireRole(minimumRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const userRank = user && ROLE_RANKING[user.role] ? ROLE_RANKING[user.role] : 0;
    const requiredRank = ROLE_RANKING[minimumRole] || 99; // Default to impossible if role unknown

    if (userRank < requiredRank) {
      return res.status(403).json({ error: 'Inadequate permissions. Required: ' + minimumRole });
    }
    next();
  };
}
