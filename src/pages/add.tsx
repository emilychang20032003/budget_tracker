import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

import { useExpenses } from "@/hooks/use-expenses";
import { useBudgetConfig } from "@/hooks/use-budget-config";
import { getCurrentCycleId } from "@/lib/budget-utils";
import { Category, PaymentMethod } from "@/lib/constants";
import { Expense } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  date: z.string(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  category: z.string() as z.ZodType<Category>,
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.string() as z.ZodType<PaymentMethod>,
  countsTowardBudget: z.boolean(),
});

export default function AddExpense() {
  const [, setLocation] = useLocation();
  const { addExpense, getExpensesByCycle } = useExpenses();
  const { config } = useBudgetConfig();
  const { toast } = useToast();
  
  const currentCycleId = getCurrentCycleId();
  const cycleExpenses = getExpensesByCycle(currentCycleId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: undefined,
      category: "Cafe/Restaurant",
      description: "",
      paymentMethod: "cash",
      countsTowardBudget: true,
    },
  });

  const watchCategory = form.watch("category");
  const watchAmount = form.watch("amount");
  const watchPaymentMethod = form.watch("paymentMethod");
  const watchCounts = form.watch("countsTowardBudget");

  const categorySpent = useMemo(() => {
    return cycleExpenses
      .filter(e => e.category === watchCategory && e.countsTowardBudget)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [cycleExpenses, watchCategory]);

  const categoryLimit = config.categoryBudgets[watchCategory]?.limit || 0;
  const isOverLimit = watchCounts && watchAmount && (categorySpent + watchAmount > categoryLimit);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const expense: Expense = {
      id: uuidv4(),
      ...values,
      cycleId: getCurrentCycleId(new Date(values.date)),
    };
    
    addExpense(expense);
    
    toast({
      title: "Expense added",
      description: `Added $${values.amount} for ${values.category}`,
    });
    
    setLocation("/");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif text-foreground font-bold tracking-tight">Add Expense</h1>
        <p className="text-muted-foreground text-sm">Record a new transaction</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (NTD)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} value={field.value || ''} className="text-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Lunch at cafe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(config.categoryBudgets).map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="easycard">EasyCard</SelectItem>
                        <SelectItem value="linepay">LINE Pay</SelectItem>
                        <SelectItem value="applepay">Apple Pay</SelectItem>
                        <SelectItem value="family_paid">Family-Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchPaymentMethod === "family_paid" && (
                <FormField
                  control={form.control}
                  name="countsTowardBudget"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-accent/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Count in budget?</FormLabel>
                        <FormDescription className="text-xs">
                          If disabled, this won't reduce your 10k limit.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {isOverLimit && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium leading-snug">
                    This purchase would push {watchCategory} over its monthly limit. Are you sure?
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full mt-4" size="lg">
                Save Expense
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
