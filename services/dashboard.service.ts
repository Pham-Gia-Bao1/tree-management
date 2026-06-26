import type { DashboardData } from '@/types/dashboard.types';

/**
 * Shape returned by `apiSuccess` / `apiFailure` helpers used across the API routes.
 * Kept loose on purpose since the exact helper implementation isn't shared with the client.
 */
interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/**
 * Fetch the aggregated dashboard payload from `GET /api/dashboard`.
 * Throws an `Error` with a readable message on failure so the caller
 * (e.g. `useDashboard`) can catch it and surface/log it appropriately.
 */
export async function getDashboard(): Promise<DashboardData> {
    const res = await fetch('/api/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });

    let body: ApiEnvelope<DashboardData> | DashboardData | null = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON response (e.g. empty body on network error) — fall through to status check below.
    }

    if (!res.ok) {
        const message =
            (body && typeof body === 'object' && 'message' in body && body.message) ||
            (body && typeof body === 'object' && 'error' in body && body.error) ||
            `Failed to load dashboard (HTTP ${res.status})`;
        throw new Error(String(message));
    }

    // Support both `{ success, data }` envelope and a raw `DashboardData` body.
    if (body && typeof body === 'object' && 'data' in body && body.data) {
        return body.data as DashboardData;
    }

    return body as DashboardData;
}
