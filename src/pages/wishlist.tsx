import { useState } from "react";
import { useWishlist } from "@/hooks/use-wishlist";
import { useExpenses } from "@/hooks/use-expenses";
import { getCurrentCycleId } from "@/lib/budget-utils";
import { SUMMER_SHOPPING_CAP, CATEGORY_BUDGETS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";

export default function Wishlist() {
  const { wishlist, updateItem, deleteItem, addItem } = useWishlist();
  const { getExpensesByCycle } = useExpenses();
  const { toast } = useToast();
  
  const currentCycleId = getCurrentCycleId();
  const cycleExpenses = getExpensesByCycle(currentCycleId);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<"high"|"medium"|"low">("low");
  
  const shoppingSpent = cycleExpenses
    .filter(e => e.category === "Shopping" && e.countsTowardBudget)
    .reduce((sum, e) => sum + e.amount, 0);
    
  const shoppingRemaining = Math.max(0, CATEGORY_BUDGETS["Shopping"].limit - shoppingSpent);

  // Summer Cap tracking
  const summerItems = wishlist.filter(w => w.status === "bought");
  const summerSpent = summerItems.reduce((sum, w) => sum + (w.actualPrice || w.estimatedPrice), 0);
  const summerRemaining = Math.max(0, SUMMER_SHOPPING_CAP - summerSpent);

  const getCoachMessage = (item: any) => {
    if (item.status === "bought" || item.status === "skipped") return null;
    
    if (shoppingRemaining < item.estimatedPrice) {
      return "No, don't buy this yet. It's over your current limit.";
    }
    
    if (shoppingRemaining < CATEGORY_BUDGETS["Shopping"].limit * 0.3) {
      return "You can only afford this if you reduce cafe spending this week.";
    }
    
    if (item.priority === "low" && shoppingRemaining < CATEGORY_BUDGETS["Shopping"].limit * 0.6) {
      return "This is not a need. Delay it to next cycle.";
    }
    
    return null;
  };

  const handleMarkBought = (id: string, estimatedPrice: number) => {
    const actualStr = window.prompt(`Enter actual price paid (estimated: $${estimatedPrice}):`, estimatedPrice.toString());
    if (actualStr === null) return;
    
    const actualPrice = Number(actualStr);
    if (isNaN(actualPrice) || actualPrice <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    if (actualPrice > shoppingRemaining) {
      if (!window.confirm(`WARNING: This purchase ($${actualPrice}) exceeds your remaining shopping budget ($${shoppingRemaining}). Mark as bought anyway?`)) {
        return;
      }
    }
    
    if (summerSpent + actualPrice > SUMMER_SHOPPING_CAP) {
      if (!window.confirm(`WARNING: This pushes you over your Summer Cap! Continue?`)) {
        return;
      }
    }

    updateItem(id, { status: "bought", actualPrice });
    toast({ title: "Item marked as bought!" });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    
    addItem({
      id: uuidv4(),
      name: newItemName,
      estimatedPrice: Number(newItemPrice),
      actualPrice: null,
      priority: newItemPriority,
      status: "not_bought",
      cycleId: currentCycleId,
      notes: ""
    });
    
    setNewItemName("");
    setNewItemPrice("");
    setNewItemPriority("low");
    setIsAddOpen(false);
    toast({ title: "Item added to wishlist" });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif text-foreground font-bold tracking-tight">Wishlist</h1>
        <p className="text-muted-foreground text-sm">Summer Shopping Cap</p>
      </div>

      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="pt-6 pb-5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Summer Cap</p>
              <div className="text-2xl font-bold text-foreground">
                ${summerRemaining.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">left</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Spent: ${summerSpent}</p>
              <p className="text-xs text-muted-foreground">Cap: ${SUMMER_SHOPPING_CAP}</p>
            </div>
          </div>
          <Progress 
            value={Math.min(100, (summerSpent / SUMMER_SHOPPING_CAP) * 100)} 
            className="h-2 bg-primary/20" 
            indicatorClassName={summerSpent > SUMMER_SHOPPING_CAP ? "bg-destructive" : "bg-primary"}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-serif font-semibold">Items</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal border-primary/20 bg-primary/5 text-primary">Monthly left: ${shoppingRemaining}</Badge>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] w-[400px] rounded-xl">
                <DialogHeader>
                  <DialogTitle>Add to Wishlist</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input id="name" value={newItemName} onChange={e => setNewItemName(e.target.value)} required placeholder="e.g. New jacket" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Estimated Price (NTD)</Label>
                    <Input id="price" type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required placeholder="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newItemPriority} onValueChange={(v: any) => setNewItemPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Nice to have</SelectItem>
                        <SelectItem value="medium">Medium - Want</SelectItem>
                        <SelectItem value="high">High - Need</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Add Item</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {wishlist.map(item => {
          const coachMsg = getCoachMessage(item);
          
          return (
            <Card key={item.id} className={`shadow-sm overflow-hidden ${item.status === 'skipped' ? 'opacity-50 grayscale' : ''}`}>
              <CardContent className="p-4 relative">
                <button 
                  onClick={() => {
                    if(window.confirm("Delete this wishlist item?")) deleteItem(item.id);
                  }}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex justify-between items-start mb-2 pr-8">
                  <h3 className={`font-medium ${item.status === 'bought' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.name}
                  </h3>
                  <div className="text-right ml-2 shrink-0">
                    <span className="font-semibold text-sm block">
                      ${item.actualPrice || item.estimatedPrice}
                    </span>
                    {item.actualPrice && <span className="text-[9px] text-muted-foreground block">Actual</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`text-[10px] h-5 ${
                    item.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                    item.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                    'bg-secondary/10 text-secondary border-secondary/20'
                  }`}>
                    {item.priority}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5 bg-muted text-muted-foreground">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>

                {coachMsg && (
                  <div className="mb-3 p-2 bg-accent/30 rounded-md flex items-start gap-2 border border-accent/50">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-snug italic">"{coachMsg}"</p>
                  </div>
                )}

                {(item.status === 'not_bought' || item.status === 'considering') && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                      onClick={() => handleMarkBought(item.id, item.estimatedPrice)}
                    >
                      <Check className="w-3 h-3 mr-1" /> Bought
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => updateItem(item.id, { status: "skipped" })}
                    >
                      <X className="w-3 h-3 mr-1" /> Skip
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {wishlist.length === 0 && (
           <div className="text-center py-8">
             <p className="text-muted-foreground text-sm">Your wishlist is empty.</p>
           </div>
        )}
      </div>
    </div>
  );
}
