import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (request: Request, response: Response) => Promise<unknown>;

export function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next: NextFunction) => {
    void handler(request, response).catch(next);
  };
}
