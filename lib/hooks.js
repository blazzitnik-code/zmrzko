'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── AUTH ───
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signInWithGoogle, signOut };
}

// ─── HOUSEHOLD ───
export function useHousehold(user) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: memberData } = await supabase
      .from('household_members')
      .select('household_id, role, display_name, households(id, name, join_code)')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    if (memberData?.households) {
      setHousehold(memberData.households);
      // Fetch all members
      const { data: allMembers } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', memberData.households.id);
      if (allMembers) setMembers(allMembers);
    } else {
      setHousehold(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const createHousehold = async (name, displayName) => {
    const { data } = await supabase.rpc('create_household', {
      p_name: name, p_user_id: user.id, p_display_name: displayName,
    });
    await fetch();
    return data;
  };

  const joinHousehold = async (code, displayName) => {
    const { data, error } = await supabase.rpc('join_household', {
      p_code: code.toUpperCase(), p_user_id: user.id, p_display_name: displayName,
    });
    if (error) throw error;
    await fetch();
    return data;
  };

  return { household, members, loading, createHousehold, joinHousehold, refetch: fetch };
}

// ─── GENERIC HOUSEHOLD-SCOPED TABLE HOOK ───
function useHouseholdTable(tableName, householdId, orderBy = 'created_at', ascending = false) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return; }
    const { data: rows } = await supabase
      .from(tableName)
      .select('*')
      .eq('household_id', householdId)
      .order(orderBy, { ascending });
    if (rows) setData(rows);
    setLoading(false);
  }, [householdId, tableName, orderBy, ascending]);

  useEffect(() => {
    fetch();
    const ch = supabase.channel(`${tableName}-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch, tableName, householdId]);

  return { data, loading, refetch: fetch };
}

// ─── FREEZER ITEMS ───
export function useItems(householdId) {
  const { data: items, loading, refetch } = useHouseholdTable('items', householdId, 'expiry', true);

  const addItem = async (item) => {
    await supabase.from('items').insert([{ ...item, household_id: householdId }]);
  };
  const updateItem = async (id, updates) => {
    await supabase.from('items').update(updates).eq('id', id);
  };
  const deleteItem = async (id) => {
    await supabase.from('items').delete().eq('id', id);
  };

  return { items, loading, addItem, updateItem, deleteItem, refetch };
}

// ─── ARCHIVED ───
export function useArchived(householdId) {
  const { data: archived, loading, refetch } = useHouseholdTable('archived', householdId, 'archived_at', false);

  const archiveItem = async (item, wasted = false) => {
    await supabase.from('archived').insert([{
      name: item.name, cat: item.cat, qty: item.qty, packets: item.packets,
      label: item.label, frozen: item.frozen, expiry: item.expiry,
      freezer: item.freezer, wasted, household_id: householdId,
    }]);
    await supabase.from('items').delete().eq('id', item.id);
  };

  return { archived, loading, archiveItem, refetch };
}

// ─── FREEZERS ───
export function useFreezers(householdId) {
  const { data: freezers, loading, refetch } = useHouseholdTable('freezers', householdId, 'sort_order', true);

  const addFreezer = async (freezer) => {
    const id = freezer.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    await supabase.from('freezers').insert([{
      id, name: freezer.name, icon: freezer.icon, sort_order: freezers.length, household_id: householdId,
    }]);
  };

  return { freezers, addFreezer, refetch };
}

// ─── CATEGORIES ───
export function useCategories(householdId) {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return; }
    // Get household-specific + global defaults
    const { data } = await supabase.from('categories').select('*')
      .or(`household_id.eq.${householdId},household_id.is.null`);
    if (data) {
      const map = {};
      data.forEach(c => { map[c.id] = { label: c.label, icon: c.icon, color: c.color, months: c.months }; });
      setCategories(map);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetch();
    const ch = supabase.channel(`categories-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch, householdId]);

  const addCategory = async (cat) => {
    const id = cat.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    await supabase.from('categories').insert([{
      id, label: cat.label, icon: cat.icon, color: cat.color, months: cat.months, household_id: householdId,
    }]);
  };

  return { categories, loading, addCategory, refetch: fetch };
}

// ─── SHOPPING ITEMS ───
export function useShoppingItems(householdId) {
  const { data: items, loading, refetch } = useHouseholdTable('shopping_items', householdId, 'created_at', false);

  const addItem = async (item) => {
    await supabase.from('shopping_items').insert([{ ...item, household_id: householdId }]);
  };
  const updateItem = async (id, updates) => {
    await supabase.from('shopping_items').update(updates).eq('id', id);
  };
  const deleteItem = async (id) => {
    await supabase.from('shopping_items').delete().eq('id', id);
  };

  return { items, loading, addItem, updateItem, deleteItem, refetch };
}

// ─── SHOPPING ARCHIVED ───
export function useShoppingArchived(householdId) {
  const { data: archived, loading, refetch } = useHouseholdTable('shopping_archived', householdId, 'completed_at', false);

  const archiveChecked = async (items) => {
    const toArchive = items.map(i => ({
      name: i.name, qty: i.qty || '', category: i.category || '', store: i.store || '',
      household_id: householdId,
    }));
    await supabase.from('shopping_archived').insert(toArchive);
    for (const item of items) {
      await supabase.from('shopping_items').delete().eq('id', item.id);
    }
  };

  return { archived, archiveChecked, refetch };
}

// ─── SHOPPING FAVOURITES ───
export function useShoppingFavourites(householdId) {
  const { data: favourites, loading, refetch } = useHouseholdTable('shopping_favourites', householdId, 'use_count', false);

  const toggleFavourite = async (name) => {
    const existing = favourites.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await supabase.from('shopping_favourites').delete().eq('id', existing.id);
    } else {
      await supabase.from('shopping_favourites').insert([{
        name, household_id: householdId, use_count: 1, last_used: new Date().toISOString(),
      }]);
    }
  };

  return { favourites, toggleFavourite, refetch };
}

// ─── SHOPPING STORES ───
export function useShoppingStores(householdId) {
  const { data: stores, loading, refetch } = useHouseholdTable('shopping_stores', householdId, 'sort_order', true);

  const addStore = async (store) => {
    const id = store.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    await supabase.from('shopping_stores').insert([{
      id, name: store.name, icon: store.icon, sort_order: stores.length, household_id: householdId,
    }]);
  };

  return { stores, addStore, refetch };
}
