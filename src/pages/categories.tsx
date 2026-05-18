import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useExpenses } from "@/hooks/use-expenses";
import { useBudgetConfig } from "@/hooks/use-budget-config";
import { getCurrentCycleId } from "@/lib/budget-utils";
import { Category } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PiggyBank, Settings, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const configSchema = z.object({
  totalBudget: z.coerce.number().min(1, "Required"),
  savingsTarget: z.coerce.number().min(0, "Required"),
  categories: z.array(z.object({
    category: z.string(),
    limit: z.coerce.number().min(1, "Required"),
    weeklyLimit: z.coerce.number().min(0).optional(),
  })),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function Categories() {
  const { getExpensesByCycle } = useExpenses();
  const { config, updateTotalBudget, updateSavingsTarget, updateCategoryBudget, resetToDefaults } = useBudgetConfig();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const currentCycleId = getCurrentCycleId();
  const cycleExpenses = getExpensesByCycle(currentCycleId).filter(e => e.countsTowardBudget);

  const spentByCategory = useMemo(() => {
    const acc = {} as Record<Category, number>;
    Object.keys(config.categoryBudgets).forEach(k => { acc[k as Category] = 0; });
    cycleExpenses.forEach(e => { acc[e.category] = (acc[e.category] || 0) + e.amount; });
    return acc;
  }, [cycleExpenses, config.categoryBudgets]);

  const totalSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const projectedSavings = Math.max(0, config.totalBudget - totalSpent);
  const savingsOnTrack = projectedSavings >= config.savingsTarget;
  const categories = Object.values(config.categoryBudgets);

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
  });

  const { fields } = useFieldArray({ control: form.control, name: "categories" });

  const openSettings = () => {
    form.reset({
      totalBudget: config.totalBudget,
      savingsTarget: config.savingsTarget,
      categories: categories.map(c => ({
        category: c.category,
        limit: c.limit,
        weeklyLimit: c.weeklyLimit ?? 0,
      })),
    });
    setSettingsOpen(true);
  };

  const onSave = (values: ConfigForm) => {
    updateTotalBudget(values.totalBudget);
    updateSavingsTarget(values.savingsTarget);
    values.categories.forEach(c => {
      updateCategoryBudget(
        c.category as Category,
        c.limit,
        c.weeklyLimit && c.weeklyLimit > 0 ? c.weeklyLimit : undefined
      );
    });
    toast({ title: "Budget settings saved" });
    setSettingsOpen(false);
  };

  const handleReset = () => {
    resetToDefaults();
    toast({ title: "Reset to defaults" });
    setSettingsOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif text-foreground font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground text-sm">Monthly category limits</p>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={openSettings}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const spent = spentByCategory[cat.category] || 0;
          const remaining = cat.limit - spent;
          const percentage = (spent / cat.limit) * 100;

          let status: "safe" | "careful" | "danger" | "over" = "safe";
          let indicatorClass = "bg-secondary";
          if (percentage >= 100) { status = "over"; indicatorClass = "bg-destructive"; }
          else if (percentage >= 90) { status = "danger"; indicatorClass = "bg-orange-400"; }
          else if (percentage >= 70) { status = "careful"; indicatorClass = "bg-amber-400"; }

          return (
            <Card key={cat.category} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-foreground">{cat.category}</h3>
                    <p className="text-xs text-muted-foreground">Limit: ${cat.limit.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${Math.max(0, remaining).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">left</p>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, percentage)}
                  className="h-2 mb-2 bg-muted"
                  indicatorClassName={indicatorClass}
                />

                <div className="flex justify-between items-center mt-3">
                  <Badge variant="outline" className={`text-[10px] font-normal ${
                    status === 'safe' ? 'text-secondary border-secondary/30 bg-secondary/10' :
                    status === 'careful' ? 'text-amber-600 border-amber-600/30 bg-amber-600/10' :
                    status === 'danger' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' :
                    'text-destructive border-destructive/30 bg-destructive/10'
                  }`}>
                    {status === 'safe' && 'Safe'}
                    {status === 'careful' && 'Careful'}
                    {status === 'danger' && 'Danger'}
                    {status === 'over' && 'Over Budget'}
                  </Badge>
                  {cat.weeklyLimit && (
                    <span className="text-[10px] text-muted-foreground">Pace: ${cat.weeklyLimit}/wk</span>
                  )}
                </div>

                {status === 'over' && (
                  <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                    <p className="text-xs text-destructive font-medium">
                      Over budget. Please reduce spending in another category to compensate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Savings Reminder */}
        <Card className={`shadow-sm border-2 ${savingsOnTrack ? 'border-secondary/30 bg-secondary/5' : 'border-amber-400/30 bg-amber-50/40'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full shrink-0 ${savingsOnTrack ? 'bg-secondary/20 text-secondary' : 'bg-amber-400/20 text-amber-600'}`}>
                <PiggyBank className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-foreground">Savings</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Target: ${config.savingsTarget.toLocaleString()} this cycle</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${savingsOnTrack ? 'text-secondary' : 'text-amber-600'}`}>
                      ${projectedSavings.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">projected</p>
                  </div>
                </div>
                <Progress
                  value={Math.min(100, (projectedSavings / config.savingsTarget) * 100)}
                  className="h-2 mt-3 bg-muted"
                  indicatorClassName={savingsOnTrack ? "bg-secondary" : "bg-amber-400"}
                />
                <p className={`text-xs mt-2 font-medium ${savingsOnTrack ? 'text-secondary' : 'text-amber-600'}`}>
                  {savingsOnTrack
                    ? `On track — you will save $${projectedSavings.toLocaleString()} if you stop here.`
                    : `Spend ${config.savingsTarget - projectedSavings > 0 ? `$${(config.savingsTarget - projectedSavings).toLocaleString()} less` : 'nothing more'} to hit your savings target.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-serif text-left">Edit Budget Settings</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">

              {/* Total budget + savings */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget (NTD)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="savingsTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Savings Target</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Per-category limits */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Category Limits</p>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 pb-4 border-b border-border last:border-0">
                    <p className="text-sm text-muted-foreground font-medium">{form.watch(`categories.${index}.category`)}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`categories.${index}.limit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Monthly Limit</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`categories.${index}.weeklyLimit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Weekly Pace <span className="text-muted-foreground">(optional)</span></FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="—" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 text-muted-foreground"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </Button>
                <Button type="submit" className="flex-1">
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
