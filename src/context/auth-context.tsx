'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shop } from '@/types';
import { db, MOCK_SHOPS } from '@/lib/db';

interface AuthContextType {
  currentShop: Shop;
  availableShops: Shop[];
  switchShop: (shopId: string) => void;
  createNewShop: (name: string, email: string, kpayNumber?: string, kpayName?: string) => Promise<Shop>;
  updateCurrentShop: (updates: Partial<Shop>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentShop, setCurrentShop] = useState<Shop>(MOCK_SHOPS[0]);
  const [availableShops, setAvailableShops] = useState<Shop[]>(MOCK_SHOPS);
  const [isLoading, setIsLoading] = useState(true);

  // Load shops and persisted shop choice on mount
  useEffect(() => {
    async function load() {
      const shops = await db.getShops();
      setAvailableShops(shops);

      const savedShopId = typeof window !== 'undefined' ? localStorage.getItem('shweshop_active_shop_id') : null;
      if (savedShopId) {
        const found = shops.find((s) => s.id === savedShopId);
        if (found) {
          setCurrentShop(found);
        }
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const switchShop = (shopId: string) => {
    const target = availableShops.find((s) => s.id === shopId);
    if (target) {
      setCurrentShop(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('shweshop_active_shop_id', shopId);
      }
    }
  };

  const createNewShop = async (
    name: string,
    email: string,
    kpayNumber?: string,
    kpayName?: string
  ): Promise<Shop> => {
    const newShop = await db.createShop({
      name,
      ownerEmail: email,
      kpayNumber,
      kpayName,
    });
    setAvailableShops((prev) => [...prev, newShop]);
    setCurrentShop(newShop);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shweshop_active_shop_id', newShop.id);
    }
    return newShop;
  };

  const updateCurrentShop = async (updates: Partial<Shop>) => {
    const updated = await db.updateShop(currentShop.id, updates);
    if (updated) {
      setCurrentShop(updated);
      setAvailableShops((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentShop,
        availableShops,
        switchShop,
        createNewShop,
        updateCurrentShop,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
