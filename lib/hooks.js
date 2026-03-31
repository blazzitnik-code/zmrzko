'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── FREEZER ITEMS ───
export function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('items').select('*').order('expiry', { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('items-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addItem = async (item) => {
    const { data } = await supabase.from('items').insert([item]).select().single();
    return data;
  };
  const updateItem = async (id, updates) => {
    await supabase.from('items').update(updates).eq('id', id);
  };
  const deleteItem = async (id) => {
    await supabase.from('items').delete().eq('id', id);
  };

  return { items, loading, addItem, updateItem, deleteItem, refetch: fetch };
}

// ─── ARCHIVED (with waste tracking) ───
export function useArchived() {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('archived').select('*').order('archived_at', { ascending: false });
    if (data) setArchived(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('archived-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archived' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const archiveItem = async (item, wasted = false) => {
    await supabase.from('archived').insert([{
      name: item.name, cat: item.cat, qty: item.qty, packets: item.packets,
      label: item.label, frozen: item.frozen, expiry: item.expiry,
      freezer: item.freezer, wasted,
    }]);
    await supabase.from('items').delete().eq('id', item.id);
  };

  return { archived, loading, archiveItem, refetch: fetch };
}

// ─── FREEZERS ───
export function useFreezers() {
  const [freezers, setFreezers] = useState([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('freezers').select('*').order('sort_order');
    if (data) setFreezers(data);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('freezers-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freezers' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addFreezer = async (freezer) => {
    await supabase.from('freezers').insert([{
      id: freezer.name.toLowerCase().replace(/\s+/g, '_'),
      name: freezer.name, icon: freezer.icon, sort_order: freezers.length,
    }]);
  };

  return { freezers, addFreezer, refetch: fetch };
}

// ─── CATEGORIES ───
export function useCategories() {
  const [categories, setCategories] = useState({});

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      const map = {};
      data.forEach(c => { map[c.id] = { label: c.label, icon: c.icon, color: c.color, months: c.months }; });
      setCategories(map);
    }
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('categories-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addCategory = async (cat) => {
    const id = cat.label.toLowerCase().replace(/\s+/g, '_');
    await supabase.from('categories').insert([{
      id, label: cat.label, icon: cat.icon, color: cat.color, months: cat.months,
    }]);
  };

  return { categories, addCategory, refetch: fetch };
}

// ─── SHOPPING ITEMS ───
export function useShoppingItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('shopping_items').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('shop-items-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addItem = async (item) => {
    const { data } = await supabase.from('shopping_items').insert([item]).select().single();
    return data;
  };
  const updateItem = async (id, updates) => {
    await supabase.from('shopping_items').update(updates).eq('id', id);
  };
  const deleteItem = async (id) => {
    await supabase.from('shopping_items').delete().eq('id', id);
  };

  return { items, loading, addItem, updateItem, deleteItem, refetch: fetch };
}

// ─── SHOPPING ARCHIVED ───
export function useShoppingArchived() {
  const [archived, setArchived] = useState([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('shopping_archived').select('*').order('completed_at', { ascending: false });
    if (data) setArchived(data);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('shop-arch-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_archived' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const archiveChecked = async (items) => {
    const toArchive = items.map(i => ({
      name: i.name, qty: i.qty || '', category: i.category || '', store: i.store || '',
    }));
    await supabase.from('shopping_archived').insert(toArchive);
    // Delete archived items from shopping_items
    const ids = items.map(i => i.id);
    for (const id of ids) {
      await supabase.from('shopping_items').delete().eq('id', id);
    }
  };

  return { archived, archiveChecked, refetch: fetch };
}

// ─── SHOPPING FAVOURITES ───
export function useShoppingFavourites() {
  const [favourites, setFavourites] = useState([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('shopping_favourites').select('*').order('use_count', { ascending: false });
    if (data) setFavourites(data);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('shop-fav-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_favourites' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const toggleFavourite = async (name, category = '') => {
    const existing = favourites.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await supabase.from('shopping_favourites').delete().eq('id', existing.id);
    } else {
      await supabase.from('shopping_favourites').upsert([{
        name, category, use_count: 1, last_used: new Date().toISOString(),
      }], { onConflict: 'name' });
    }
  };

  return { favourites, toggleFavourite, refetch: fetch };
}

// ─── SHOPPING STORES ───
export function useShoppingStores() {
  const [stores, setStores] = useState([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('shopping_stores').select('*').order('sort_order');
    if (data) setStores(data);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('shop-stores-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_stores' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addStore = async (store) => {
    const id = store.name.toLowerCase().replace(/\s+/g, '_');
    await supabase.from('shopping_stores').insert([{
      id, name: store.name, icon: store.icon, sort_order: stores.length,
    }]);
  };

  return { stores, addStore, refetch: fetch };
}
