import type { Request, Response, NextFunction } from 'express';
import { pool } from './db.js';
import type { Role } from './types.js';

const levels: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

export function requireRole(minRole: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
        const role = ((req.headers['x-user-role'] as string) || 'viewer') as Role;
        if (!(role in levels)) {
            return res.status(401).json({ error: 'Invalid role header' });
        }
        if (levels[role] < levels[minRole]) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        (req as any).role = role;
        next();
    };
}

export function currentActor(req: Request): { actor: string; role: Role } {
    const role = (((req.headers['x-user-role'] as string) || 'admin')) as Role;
    const actor =
        role === 'admin' ? 'Alex Admin' : role === 'editor' ? 'Erin Editor' : 'Vic Viewer';
    return { actor, role };
}

export async function logActivity(
    actor: string,
    role: Role,
    action: string,
    target: string
): Promise<void> {
    await pool.query(
        'INSERT INTO activity_log (actor, role, action, target) VALUES ($1,$2,$3,$4)',
        [actor, role, action, target]
    );
}