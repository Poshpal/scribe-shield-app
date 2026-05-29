import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { FileText, LayoutDashboard, FilePlus, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, profile, roles, isAdmin, signOut } = useAuthContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isAuthenticated) void navigate({ to: "/login" });
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const nav = [
    { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { to: "/documents", label: "Documentos", icon: FileText },
    { to: "/documents/new", label: "Nuevo", icon: FilePlus },
    ...(isAdmin ? [{ to: "/admin", label: "Administración", icon: Settings }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">Control de Documentos</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <p className="mt-1 text-xs">
            {roles.length ? roles.join(", ") : "sin rol"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start"
            onClick={async () => { await signOut(); void navigate({ to: "/" }); }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5 text-primary" /> CD
          </Link>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); void navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-x-hidden p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
