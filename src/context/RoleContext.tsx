import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role } from '../api/types';

const ROLES: Role[] = ['admin', 'editor', 'viewer'];

function storedRole(): Role {
    const saved = localStorage.getItem('hh-role');
    return ROLES.includes(saved as Role) ? (saved as Role) : 'admin';
}

const RoleContext = createContext<{
    role: Role;
    setRole: (role: Role) => void;
} | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
    const [role, setRoleState] = useState<Role>(storedRole);

    const setRole = (next: Role) => {
        localStorage.setItem('hh-role', next);
        setRoleState(next);
    };

    return (
        <RoleContext.Provider value={{ role, setRole }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const value = useContext(RoleContext);
    if (!value) throw new Error('useRole must be used inside RoleProvider');
    return value;
}

export function usePermissions() {
    const { role } = useRole();
    return {
        role,
        canWrite: role === 'admin' || role === 'editor',
        canAdmin: role === 'admin'
    };
}