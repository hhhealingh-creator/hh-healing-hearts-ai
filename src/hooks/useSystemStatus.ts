import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSystemStatus() {
    return useQuery({
        queryKey: ['system'],
        queryFn: api.getSystemStatus,
        refetchInterval: 30_000
    });
}