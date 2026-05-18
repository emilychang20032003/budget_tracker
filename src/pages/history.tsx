import { useState, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useExpenses } from "@/hooks/use-expenses";
import { getCurrentCycleId } from "@/lib/budget-utils";
import { CATEGORY_BUDGETS, Category, PaymentMethod } from "@/lib/constants";
import { Expense } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const editSchema = z.object({
  date: z.string(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  category: z.string() as z.ZodType<Category>,
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.string() as z.ZodType<PaymentMethod>,
  countsTowardBudget: z.boolean(),
});

type EditForm = z.infer<typeof editSchema>;

export default function History() {
  const { expenses, deleteExpense, updateExpense, setExpenses } = useExpenses();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterCycle, setFilterCycle] = useState<string>(getCurrentCycleId());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      date: "",
      amount: 0,
      category: "Cafe/Restaurant",
      description: "",
      paymentMethod: "cash",
      countsTowardBudget: true,
    },
  });

  const watchPaymentMethod = form.watch("paymentMethod");

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      countsTowardBudget: expense.countsTowardBudget,
    });
  };

  const onSave = (values: EditForm) => {
    if (!editingExpense) return;
    updateExpense(editingExpense.id, {
      ...values,
      cycleId: getCurrentCycleId(new Date(values.date)),
    });
    toast({ title: "Expense updated" });
    setEditingExpense(null);
  };

  const onDelete = () => {
    if (!editingExpense) return;
    deleteExpense(editingExpense.id);
    toast({ title: "Expense deleted" });
    setEditingExpense(null);
  };

  const uniqueCycles = useMemo(() => {
    const cycles = new Set(expenses.map(e => e.cycleId));
    cycles.add(getCurrentCycleId());
    return Array.from(cycles).sort().reverse();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => e.cycleId === filterCycle)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCycle]);

  const regularExpenses = filteredExpenses.filter(e => e.countsTowardBudget);
  const familyCovered = filteredExpenses.filter(e => !e.countsTowardBudget);

  const handleExport = () => {
    if (expenses.length === 0) return;
    const headers = "id,date,amount,category,description,paymentMethod,countsTowardBudget,cycleId\n";
    const csv = expenses.map(e => {
      const desc = e.description.replace(/"/g, '""');
      return `"${e.id}","${e.date}",${e.amount},"${e.category}","${desc}","${e.paymentMethod}",${e.countsTowardBudget},"${e.cycleId}"`;
    }).join("\n");
    const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `budget_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      const lines = csvData.split('\n');
      const newExpenses: Expense[] = [];
      const existingIds = new Set(expenses.map(ex => ex.id));
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push(match[1].replace(/^"|"$/g, ''));
        }
        if (matches.length >= 8) {
          const id = matches[0];
          if (!existingIds.has(id)) {
            newExpenses.push({
              id,
              date: matches[1],
              amount: Number(matches[2]),
              category: matches[3] as any,
              description: matches[4].replace(/""/g, '"'),
              paymentMethod: matches[5] as any,
              countsTowardBudget: matches[6] === 'true',
              cycleId: matches[7]
            });
            existingIds.add(id);
          }
        }
      }
      if (newExpenses.length > 0) {
        setExpenses(prev => [...prev, ...newExpenses]);
        toast({ title: "Import successful", description: `Added ${newExpenses.length} new expenses.` });
      } else {
        toast({ title: "No new expenses", description: "All imported expenses were already present or format was invalid." });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ExpenseList = ({ items, title }: { items: typeof expenses, title: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3 mt-6">
        <h3 className="font-serif font-medium text-foreground">{title}</h3>
        <div className="space-y-2">
          {items.map(expense => (
            <Card
              key={expense.id}
              className="shadow-none border-border cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => openEdit(expense)}
            >
              <CardContent className="p-3 flex justify-between items-center">
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{expense.description}</span>
                    {expense.paymentMethod === 'family_paid' && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/20 text-primary shrink-0">Family</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(parseISO(expense.date), 'MMM d')}</span>
                    <span>•</span>
                    <span className="truncate">{expense.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-semibold text-foreground">${expense.amount}</span>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif text-foreground font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground text-sm">Tap any expense to edit</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 text-xs shrink-0">
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="pt-2">
        <Select value={filterCycle} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Cycle" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCycles.map(cycle => (
              <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-muted-foreground text-sm">No expenses recorded for this cycle.</p>
        </div>
      ) : (
        <>
          <ExpenseList items={regularExpenses} title="Budget Expenses" />
          <ExpenseList items={familyCovered} title="Family Covered (Not in budget)" />
        </>
      )}

      {/* Edit Sheet */}
      <Sheet open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-serif text-left">Edit Expense</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">

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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(CATEGORY_BUDGETS).map((cat) => (
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
                <Button type="submit" className="flex-2 flex-grow-[2]">
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
