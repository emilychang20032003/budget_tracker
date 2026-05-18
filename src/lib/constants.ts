import { BudgetConfig, Category, WishlistItem } from "./types";

export const BUDGET_CYCLE_START_DAY = 18;
export const TOTAL_BUDGET = 10000;
export const SUMMER_SHOPPING_CAP = 4000;
export const SAVINGS_TARGET = 651;

export const CATEGORY_BUDGETS: Record<Category, BudgetConfig> = {
  "Transportation": { category: "Transportation", limit: 1200 },
  "Gym": { category: "Gym", limit: 1199 },
  "Massage": { category: "Massage", limit: 750 },
  "Cafe/Restaurant": { category: "Cafe/Restaurant", limit: 3600, weeklyLimit: 900 },
  "Snack/Night Market": { category: "Snack/Night Market", limit: 800, weeklyLimit: 200 },
  "Shopping": { category: "Shopping", limit: 1000 },
  "Bar/Exhibition": { category: "Bar/Exhibition", limit: 800, weeklyLimit: 200 },
};

export const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: "w1",
    name: "Dark brown mid-calf wide boots",
    estimatedPrice: 2500,
    actualPrice: null,
    priority: "high",
    status: "not_bought",
    cycleId: "2026-05",
    notes: ""
  },
  {
    id: "w2",
    name: "Longer socks",
    estimatedPrice: 300,
    actualPrice: null,
    priority: "low",
    status: "not_bought",
    cycleId: "2026-05",
    notes: ""
  },
  {
    id: "w3",
    name: "Curved / sickle-style pants #1",
    estimatedPrice: 1000,
    actualPrice: null,
    priority: "medium",
    status: "not_bought",
    cycleId: "2026-05",
    notes: ""
  },
  {
    id: "w4",
    name: "Curved / sickle-style pants #2",
    estimatedPrice: 1000,
    actualPrice: null,
    priority: "medium",
    status: "not_bought",
    cycleId: "2026-05",
    notes: ""
  },
  {
    id: "w5",
    name: "Basic tops",
    estimatedPrice: 800,
    actualPrice: null,
    priority: "low",
    status: "not_bought",
    cycleId: "2026-05",
    notes: ""
  }
];
