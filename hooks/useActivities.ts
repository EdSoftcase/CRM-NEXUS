
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../services/supabaseClient';
import { Activity } from '../types';
import { MOCK_ACTIVITIES } from '../constants';

export const useActivities = () => {
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities'],
    queryFn: async (): Promise<Activity[]> => {
      const supabase = getSupabase();
      const saved = localStorage.getItem('nexus_activities');
      const fallbackData = saved ? JSON.parse(saved) : MOCK_ACTIVITIES;
      
      if (!supabase) {
        return Array.isArray(fallbackData) ? fallbackData : [];
      }

      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('due_date', { ascending: false });

        if (error) {
            console.warn("⚠️ Error fetching activities:", error.message);
            return Array.isArray(fallbackData) ? fallbackData : [];
        }

        return (data || []).map((item: any) => ({
            ...item,
            organizationId: item.organization_id,
            dueDate: item.due_date,
            relatedTo: item.related_to
        })) as Activity[];
      } catch (err: any) {
        console.warn("Network Error in useActivities:", err);
        return Array.isArray(fallbackData) ? fallbackData : [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const addActivityMutation = useMutation({
    mutationFn: async (activity: Activity) => {
      const supabase = getSupabase();
      if (supabase) {
          try {
            await supabase.from('activities').upsert({
                ...activity,
                organization_id: activity.organizationId,
                due_date: activity.dueDate,
                related_to: activity.relatedTo
            });
          } catch (e) {
            console.warn("Could not persist activity to cloud");
          }
      }
      return activity;
    },
    onSuccess: (newActivity) => {
      queryClient.setQueryData(['activities'], (old: Activity[] | undefined) => {
          return [newActivity, ...(old || [])];
      });
    },
  });

  return {
    activities: Array.isArray(activities) ? activities : [],
    isLoading,
    error,
    addActivity: addActivityMutation.mutate,
  };
};
