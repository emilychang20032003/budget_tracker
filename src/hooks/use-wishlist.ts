import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { WishlistItem } from "@/lib/types";
import { INITIAL_WISHLIST } from "@/lib/constants";

export function useWishlist() {
  const [wishlist, setWishlist] = useLocalStorage<WishlistItem[]>("budget_tracker_wishlist", INITIAL_WISHLIST);

  const addItem = useCallback((item: WishlistItem) => {
    setWishlist((prev) => [...prev, item]);
  }, [setWishlist]);

  const updateItem = useCallback((id: string, updated: Partial<WishlistItem>) => {
    setWishlist((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
  }, [setWishlist]);

  const deleteItem = useCallback((id: string) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  }, [setWishlist]);

  return {
    wishlist,
    addItem,
    updateItem,
    deleteItem
  };
}
