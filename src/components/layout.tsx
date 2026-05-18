import { Link, useLocation } from "wouter";
import { Home, PieChart, PlusCircle, List, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/categories", icon: PieChart, label: "Budgets" },
    { href: "/add", icon: PlusCircle, label: "Add", main: true },
    { href: "/history", icon: List, label: "History" },
    { href: "/wishlist", icon: Heart, label: "Wishlist" },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden max-w-md mx-auto relative shadow-2xl">
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-6 py-3 pb-safe z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <ul className="flex items-center justify-between">
          {navItems.map((item) => {
            const isActive = location === item.href;
            if (item.main) {
              return (
                <li key={item.href} className="relative -top-6">
                  <Link href={item.href} className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover-elevate transition-transform active:scale-95">
                      <item.icon size={28} strokeWidth={2.5} />
                    </div>
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
