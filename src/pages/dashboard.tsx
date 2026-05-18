import { useMemo } from "react";
import { format } from "date-fns";
import { useExpenses } from "@/hooks/use-expenses";
import { useBudgetConfig } from "@/hooks/use-budget-config";
import { getCurrentCycleId, getCycleRange, getDaysInCycle, getDaysRemaining, getDaysElapsed } from "@/lib/budget-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Coffee, ShoppingBag, Utensils, Ticket } from "lucide-react";

export default function Dashboard() {
  const { getExpensesByCycle } = useExpenses();
  const { config } = useBudgetConfig();
  const currentCycleId = getCurrentCycleId();
  const { start, end } = getCycleRange(currentCycleId);
  
  const cycleExpenses = getExpensesByCycle(currentCycleId);
  const budgetExpenses = cycleExpenses.filter(e => e.countsTowardBudget);
  
  const totalSpent = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRemaining = config.totalBudget - totalSpent;
  
  const daysInCycle = getDaysInCycle(currentCycleId);
  const daysRemaining = getDaysRemaining(currentCycleId);
  const daysElapsed = getDaysElapsed(currentCycleId);
  
  // Pace warning
  const currentPace = daysElapsed > 0 ? (totalSpent / daysElapsed) * daysInCycle : 0;
  const isPaceDangerous = currentPace > config.totalBudget;

  // Category spending
  const spentByCategory = useMemo(() => {
    const acc = {} as Record<string, number>;
    budgetExpenses.forEach(e => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
    });
    return acc;
  }, [budgetExpenses]);

  // Smart Warnings
  const warnings = [];
  if (isPaceDangerous) {
    warnings.push("You are spending too fast this cycle.");
  }
  const foodSpent = spentByCategory["Cafe/Restaurant"] || 0;
  const foodLimit = config.categoryBudgets["Cafe/Restaurant"]?.limit || 0;
  if (foodLimit > 0 && foodSpent > foodLimit * 0.75) {
    warnings.push("You have less than 25% of your food budget left.");
  }
  const convenienceSpent = spentByCategory["Snack/Night Market"] || 0;
  const convenienceLimit = config.categoryBudgets["Snack/Night Market"]?.limit || 0;
  if (convenienceLimit > 0 && convenienceSpent > convenienceLimit * 0.8) {
    warnings.push("Snack/Night Market spending is becoming dangerous.");
  }
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif text-foreground font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          {format(start, "MMM d")} – {format(end, "MMM d, yyyy")} ({daysRemaining} days left)
        </p>
      </div>

      {/* Main Budget Card */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remaining Budget</p>
              <div className="text-3xl font-bold text-foreground">
                ${Math.max(0, totalRemaining).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Spent</p>
              <div className="text-xl font-semibold text-muted-foreground">
                ${totalSpent.toLocaleString()}
              </div>
            </div>
          </div>
          <Progress 
            value={Math.min(100, (totalSpent / config.totalBudget) * 100)} 
            className="h-2 mb-2 bg-primary/20" 
            indicatorClassName={totalSpent > config.totalBudget ? "bg-destructive" : "bg-primary"}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{((totalSpent / config.totalBudget) * 100).toFixed(1)}% spent</span>
            <span>Total: ${config.totalBudget.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Coach Card — only shown when there are actual warnings */}
      {warnings.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <p key={i} className="text-sm font-medium text-foreground/90">{w}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What can I afford? */}
      <div className="space-y-3">
        <h2 className="text-lg font-serif font-semibold">What can I still afford?</h2>
        <div className="grid grid-cols-2 gap-3">
          <AffordCard 
            icon={Utensils} 
            title="Cafe/Restaurant" 
            cost={config.categoryBudgets["Cafe/Restaurant"]?.weeklyLimit ?? 400}
            remaining={totalRemaining} 
            categoryRemaining={(config.categoryBudgets["Cafe/Restaurant"]?.limit ?? 0) - (spentByCategory["Cafe/Restaurant"] || 0)}
          />
          <AffordCard 
            icon={Coffee} 
            title="Snack/Night Market" 
            cost={config.categoryBudgets["Snack/Night Market"]?.weeklyLimit ?? 200}
            remaining={totalRemaining} 
            categoryRemaining={(config.categoryBudgets["Snack/Night Market"]?.limit ?? 0) - (spentByCategory["Snack/Night Market"] || 0)}
          />
          <AffordCard 
            icon={ShoppingBag} 
            title="Shopping" 
            cost={Math.round((config.categoryBudgets["Shopping"]?.limit ?? 1000) / 10) * 10}
            remaining={totalRemaining}
            categoryRemaining={(config.categoryBudgets["Shopping"]?.limit ?? 0) - (spentByCategory["Shopping"] || 0)}
          />
          <AffordCard 
            icon={Ticket} 
            title="Bar/Exhibition" 
            cost={config.categoryBudgets["Bar/Exhibition"]?.weeklyLimit ?? 200}
            remaining={totalRemaining}
            categoryRemaining={(config.categoryBudgets["Bar/Exhibition"]?.limit ?? 0) - (spentByCategory["Bar/Exhibition"] || 0)}
          />
        </div>
      </div>
    </div>
  );
}

function AffordCard({ icon: Icon, title, cost, remaining, categoryRemaining }: any) {
  const canAffordOverall = remaining >= cost;
  const canAffordCategory = categoryRemaining >= cost;
  const canAfford = canAffordOverall && canAffordCategory;

  return (
    <Card className={`shadow-sm ${canAfford ? 'opacity-100' : 'opacity-60 bg-muted/50'}`}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <div className={`p-2 rounded-full ${canAfford ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium line-clamp-1">{title}</p>
          <p className="text-[10px] text-muted-foreground">${cost}</p>
        </div>
        <div className="mt-1">
          {canAfford ? (
            <span className="text-[10px] font-semibold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">Yes</span>
          ) : (
            <span className="text-[10px] font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">No</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
