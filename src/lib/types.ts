export type Category = 
  | "Transportation"
  | "Gym"
  | "Massage"
  | "Cafe/Restaurant"
  | "Snack/Night Market"
  | "Shopping"
  | "Bar/Exhibition";

export type PaymentMethod = 
  | "cash" 
  | "credit_card" 
  | "debit_card" 
  | "easycard" 
  | "linepay" 
  | "applepay" 
  | "family_paid";

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
  paymentMethod: PaymentMethod;
  countsTowardBudget: boolean;
  cycleId: string;
}

export type WishlistPriority = "high" | "medium" | "low";
export type WishlistStatus = "not_bought" | "considering" | "bought" | "skipped";

export interface WishlistItem {
  id: string;
  name: string;
  estimatedPrice: number;
  actualPrice: number | null;
  priority: WishlistPriority;
  status: WishlistStatus;
  cycleId: string;
  notes: string;
}

export interface BudgetConfig {
  category: Category;
  limit: number;
  weeklyLimit?: number;
}
