import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Receipt, 
  Search, 
  Sparkles, 
  Rocket, 
  User, 
  LogOut,
  Menu,
  ShieldCheck,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: me } = useGetMe();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/receipts", label: "Receipts", icon: Receipt },
    { href: "/search", label: "Search", icon: Search },
    { href: "/tiers", label: "Tiers", icon: Sparkles },
    { href: "/roqqet", label: "R0QQ3T", icon: Rocket },
    { href: "/account", label: "Account", icon: User },
    ...(me?.isAdmin
      ? [
          { href: "/command-center", label: "Command Center", icon: ShieldCheck },
          { href: "/command-center/zeta", label: "ZETA Terminal", icon: Terminal }
        ]
      : []),
  ];

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  const NavLinks = () => (
    <>
      <div className="mb-8 px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="N3PSQAL3 Logo" className="w-8 h-8" />
          <span className="font-mono font-bold tracking-wider cosmic-gradient-text text-xl">N3PSQAL3</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-widest">Protocol Terminal</p>
      </div>

      <nav className="space-y-1 flex-1 px-2">
        {navItems.map((item) => {
          const active = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                  active 
                    ? "text-primary bg-primary/10 font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary rounded-r-md"></div>
                )}
                <item.icon className={`w-5 h-5 ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5">
            <img src={user?.imageUrl} alt={user?.fullName || "User"} className="w-full h-full rounded-full" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
        <Link href="/terms">
          <p
            className="mt-3 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            Terms &amp; Conditions
          </p>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="N3PSQAL3 Logo" className="w-6 h-6" />
          <span className="font-mono font-bold tracking-wider cosmic-gradient-text">N3PSQAL3</span>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r border-border">
            <div className="flex flex-col h-full pt-8">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] border-r border-border bg-card/30 backdrop-blur-md h-screen sticky top-0 py-6">
        <NavLinks />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-65px)] md:min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
