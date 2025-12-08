
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
      
      // Fallback to local storage or mock if offline/no config
      if (!supabase) {
        return fallbackData;
      }

      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('dueDate', { ascending: false });

        if (error) {
            // Robust Error Handling for Permissions or Network issues
            console.warn("⚠️ Error fetching activities from Supabase:", error.message);
            return fallbackData;
        }

        return data as Activity[];
      } catch (err: any) {
        console.warn("Network/Fetch Error in useActivities (Using Fallback):", err);
        // Critical Fallback for 'Failed to fetch' (Network Down/Block)
        return fallbackData;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const addActivityMutation = useMutation({
    mutationFn: async (activity: Activity) => {
      const supabase = getSupabase();
      if (supabase) {
          // Attempt to save to cloud, but don't break if it fails
          try {
            await supabase.from('activities').upsert(activity);
          } catch (e) {
            console.warn("Could not persist activity to cloud (Offline mode?)");
          }
      }
      return activity;
    },
    onSuccess: (newActivity) => {
      // Optimistic Update: Update cache immediately
      queryClient.setQueryData(['activities'], (old: Activity[] | undefined) => {
          return [newActivity, ...(old || [])];
      });
      // Save to local storage for persistence
      const current = queryClient.getQueryData(['activities']) as Activity[];
      if (current) {
          localStorage.setItem('nexus_activities', JSON.stringify(current));
      }
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (activity: Activity) => {
        const supabase = getSupabase();
        if (supabase) {
            try {
                await supabase.from('activities').upsert(activity);
            } catch (e) {
                console.warn("Could not update activity in cloud");
            }
        }
        return activity;
    },
    onSuccess: (updatedActivity) => {
        queryClient.setQueryData(['activities'], (old: Activity[] | undefined) => {
            const newList = old ? old.map(a => a.id === updatedActivity.id ? updatedActivity : a) : [];
            localStorage.setItem('nexus_activities', JSON.stringify(newList));
            return newList;
        });
    }
  });

  return {
    activities,
    isLoading,
    error,
    addActivity: addActivityMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
  };
};
