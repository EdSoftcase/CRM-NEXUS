
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../services/supabaseClient';
import { AuditLog } from '../types';
import { MOCK_LOGS } from '../constants';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async (): Promise<AuditLog[]> => {
      const supabase = getSupabase();
      const saved = localStorage.getItem('nexus_logs');
      const fallbackData = saved ? JSON.parse(saved) : MOCK_LOGS;

      if (!supabase) {
        return fallbackData;
      }

      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(200);

        if (error) {
          console.warn("Error fetching logs from Supabase:", error.message);
          return fallbackData;
        }

        return data as AuditLog[];
      } catch (err) {
        console.warn("Network Error fetching logs (Using Fallback):", err);
        return fallbackData;
      }
    },
    // Keep data fresh for 1 minute, then re-fetch in background
    staleTime: 1000 * 60 * 1, 
  });
};
