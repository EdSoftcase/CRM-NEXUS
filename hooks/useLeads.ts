import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../services/supabaseClient';
import { Lead } from '../types';
import { MOCK_LEADS } from '../constants';

// Safe Parse Helper
const safeParse = (data: string | null, fallback: any) => {
    if (!data) return fallback;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("JSON Parse Error in useLeads:", e);
        return fallback;
    }
};

// Mapeamento Banco (snake_case) -> App (camelCase)
const mapLeadToApp = (data: any[]): Lead[] => {
  return data.map(item => {
    const newItem = { ...item };
    if (newItem.organization_id) { newItem.organizationId = newItem.organization_id; delete newItem.organization_id; }
    if (newItem.created_at) { newItem.createdAt = newItem.created_at; delete newItem.created_at; }
    if (newItem.last_contact) { newItem.lastContact = newItem.last_contact; delete newItem.last_contact; }
    return newItem as Lead;
  });
};

// Mapeamento App (camelCase) -> Banco (snake_case)
const mapLeadToDb = (lead: Lead) => {
  const payload: any = { ...lead };
  if (payload.organizationId) { payload.organization_id = payload.organizationId; delete payload.organizationId; }
  if (payload.createdAt) { payload.created_at = payload.createdAt; delete payload.createdAt; }
  if (payload.lastContact) { payload.last_contact = payload.lastContact; delete payload.lastContact; }
  return payload;
};

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      const supabase = getSupabase();
      
      // Fallback para modo offline/local se não houver supabase configurado
      if (!supabase) {
        return safeParse(localStorage.getItem('nexus_leads'), MOCK_LEADS);
      }

      try {
        const { data, error } = await supabase.from('leads').select('*');
        if (error) {
            console.warn("Supabase Leads Error:", error.message);
            // Se falhar a query (ex: tabela não existe), retorna local
            return safeParse(localStorage.getItem('nexus_leads'), MOCK_LEADS);
        }
        return mapLeadToApp(data);
      } catch (err) {
        console.warn("Network Error fetching leads:", err);
        return safeParse(localStorage.getItem('nexus_leads'), MOCK_LEADS);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
    initialData: () => safeParse(localStorage.getItem('nexus_leads'), undefined)
  });

  // Persistência local para offline fallback
  if (leads.length > 0) {
      localStorage.setItem('nexus_leads', JSON.stringify(leads));
  }

  // Mutations
  const addLeadMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const supabase = getSupabase();
      if (supabase) {
        try {
            const { error } = await supabase.from('leads').upsert(mapLeadToDb(lead));
            if (error) throw error;
        } catch (e) {
            console.warn("Error syncing new lead to cloud (Offline?)", e);
        }
      }
      return lead;
    },
    onSuccess: (newLead) => {
      // Optimistic Update
      queryClient.setQueryData(['leads'], (old: Lead[] = []) => [...old, newLead]);
      const current = queryClient.getQueryData(['leads']) as Lead[];
      localStorage.setItem('nexus_leads', JSON.stringify(current));
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const supabase = getSupabase();
      if (supabase) {
        try {
            const { error } = await supabase.from('leads').update(mapLeadToDb(lead)).eq('id', lead.id);
            if (error) throw error;
        } catch (e) {
            console.warn("Error syncing update lead to cloud", e);
        }
      }
      return lead;
    },
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(['leads'], (old: Lead[] = []) => 
        old.map(l => l.id === updatedLead.id ? updatedLead : l)
      );
      const current = queryClient.getQueryData(['leads']) as Lead[];
      localStorage.setItem('nexus_leads', JSON.stringify(current));
    }
  });

  return {
    leads,
    isLoading,
    error,
    addLead: addLeadMutation.mutate,
    addLeadAsync: addLeadMutation.mutateAsync,
    updateLead: updateLeadMutation.mutate,
    updateLeadAsync: updateLeadMutation.mutateAsync
  };
};