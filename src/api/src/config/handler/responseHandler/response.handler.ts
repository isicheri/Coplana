import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import HttpError from '../HttpError/HttpError.js';

export const responseHandler =
  (method: RequestHandler) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (error) {
      let exceptions: HttpError;
      if (error instanceof HttpError) {
        exceptions = error;
      } else {
        if (error instanceof ZodError) {
          exceptions = new HttpError('input validation error', 402, 'validation error', error);
        } else {
          exceptions = new HttpError('something went wrong!', 500, 'server error', error);
        }
      }
      next(exceptions);
    }
  };