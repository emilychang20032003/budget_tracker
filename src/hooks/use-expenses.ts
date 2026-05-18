import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Expense } from "@/lib/types";

export function useExpenses() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("budget_tracker_expenses", []);

  const addExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => [...prev, expense]);
  }, [setExpenses]);

  const updateExpense = useCallback((id: string, updated: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }, [setExpenses]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.map(e => e.id === id ? null : e).filter(Boolean) as Expense[]);
  }, [setExpenses]);

  const getExpensesByCycle = useCallback((cycleId: string) => {
    return expenses.filter(e => e.cycleId === cycleId);
  }, [expenses]);

  return {
    expenses,
    setExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCycle
  };
}
