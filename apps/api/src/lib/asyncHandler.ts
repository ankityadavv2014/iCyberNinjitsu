import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward them to Express's error handler via next().
 *
 * Express 4 does NOT catch errors from async handlers -- without this,
 * any thrown error or DB failure crashes the process.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
