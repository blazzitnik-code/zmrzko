'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── ITEMS ───
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
    const channel = supabase.channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

// ─── ARCHIVED ───
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
    const channel = supabase.channel('archived-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archived' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const archiveItem = async (item) => {
    // Insert into archived
    await supabase.from('archived').insert([{
      name: item.name, cat: item.cat, qty: item.qty, packets: item.packets,
      label: item.label, frozen: item.frozen, expiry: item.expiry, freezer: item.freezer,
    }]);
    // Delete from items
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
    const channel = supabase.channel('freezers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freezers' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const addFreezer = async (freezer) => {
    await supabase.from('freezers').insert([{
      id: freezer.name.toLowerCase().replace(/\s+/g, '_'),
      name: freezer.name,
      icon: freezer.icon,
      sort_order: freezers.length,
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
    const channel = supabase.channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const addCategory = async (cat) => {
    const id = cat.label.toLowerCase().replace(/\s+/g, '_');
    await supabase.from('categories').insert([{
      id, label: cat.label, icon: cat.icon, color: cat.color, months: cat.months,
    }]);
  };

  return { categories, addCategory, refetch: fetch };
}
