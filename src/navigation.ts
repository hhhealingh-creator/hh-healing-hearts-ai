import {
    BarChart3, Bot, CalendarDays, Inbox, LayoutDashboard,
    PenSquare, Plug, Settings, type LucideIcon
} from 'lucide-react';

export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
}

export const navItems: NavItem[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/studio', label: 'Content Studio', icon: PenSquare },
    { to: '/calendar', label: 'Social Calendar', icon: CalendarDays },
    { to: '/inbox', label: 'Unified Inbox', icon: Inbox },
    { to: '/agents', label: 'AI Agents', icon: Bot },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/integrations', label: 'Integrations', icon: Plug },
    { to: '/settings', label: 'Settings', icon: Settings }
];