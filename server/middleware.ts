import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../src/api/types';

declare global {
    namespace Express {
        interface Request {
            user: { role: Role; name: string };
        }
    }
}

export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export function httpError(status: number, message: string): HttpError {
    return new HttpError(status, message);
}

const ROLE_NAMES: Record<Role, string> = {
    admin: 'Jordan (Admin)',
    editor: 'Casey (Editor)',
    viewer: 'Riley (Viewer)'
};

export function auth(req: Request, _res: Response, next: NextFunction): void {
    const raw = req.header('x-user-role') as Role | undefined;
    const role: Role = raw && ['admin', 'editor', 'viewer'].includes(raw) ? raw : 'viewer';
    req.user = { role, name: ROLE_NAMES[role] };
    next();
}

export function requireRole(...roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!roles.includes(req.user.role)) {
            next(httpError(403, 'Your role does not permit this action.'));
            return;
        }
        next();
    };
}

export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}