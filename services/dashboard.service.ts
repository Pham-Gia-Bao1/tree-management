import type { DashboardData } from '@/types/dashboard.types';

export async function getDashboard(): Promise<DashboardData> {
    const res = await fetch('/api/dashboard', { cache: 'no-store' });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to load dashboard');
    }

    const payload = await res.json();
    return payload.data as DashboardData;
}
