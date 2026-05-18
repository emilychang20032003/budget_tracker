import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { BudgetConfig, Category } from "@/lib/types";
import { TOTAL_BUDGET, SAVINGS_TARGET, CATEGORY_BUDGETS } from "@/lib/constants";

export interface BudgetConfigState {
  totalBudget: number;
  savingsTarget: number;
  categoryBudgets: Record<Category, BudgetConfig>;
}

const DEFAULT_CONFIG: BudgetConfigState = {
  totalBudget: TOTAL_BUDGET,
  savingsTarget: SAVINGS_TARGET,
  categoryBudgets: CATEGORY_BUDGETS,
};

export function useBudgetConfig() {
  const [config, setConfig] = useLocalStorage<BudgetConfigState>(
    "budget_tracker_config",
    DEFAULT_CONFIG
  );

  const updateTotalBudget = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, totalBudget: value }));
  }, [setConfig]);

  const updateSavingsTarget = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, savingsTarget: value }));
  }, [setConfig]);

  const updateCategoryBudget = useCallback((
    category: Category,
    limit: number,
    weeklyLimit?: number
  ) => {
    setConfig(prev => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [category]: {
          category,
          limit,
          weeklyLimit: weeklyLimit || undefined,
        },
      },
    }));
  }, [setConfig]);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, [setConfig]);

  return {
    config,
    updateTotalBudget,
    updateSavingsTarget,
    updateCategoryBudget,
    resetToDefaults,
  };
}
