import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '@/services/dashboard.service';
import type { DashboardData } from '@/types/dashboard.types';

interface UseDashboardReturn {
    dashboard: DashboardData | null;
    loading: boolean;
    refreshDashboard: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getDashboard();
            setDashboard(data);
        } catch (err) {
            console.error('[useDashboard]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshDashboard();
    }, [refreshDashboard]);

    return { dashboard, loading, refreshDashboard };
}
