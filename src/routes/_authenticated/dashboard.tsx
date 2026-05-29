import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FilePlus, FileText, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Inicio · Control de Documentos" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, roles, isAdmin, refresh } = useAuthContext();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [docs, mine] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("created_by", user!.id),
      ]);
      return { total: docs.count ?? 0, mine: mine.count ?? 0 };
    },
  });

  const { data: anyAdmin } = useQuery({
    queryKey: ["any-admin"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      return (count ?? 0) > 0;
    },
  });

  async function claimAdmin() {
    const { error } = await supabase.from("user_roles").insert({ user_id: user!.id, role: "admin" });
    if (error) { toast.error(error.message); return; }
    toast.success("Eres administrador.");
    await refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Hola, {profile?.full_name || user?.email}</h1>
        <p className="mt-1 text-muted-foreground">
          Roles: <span className="font-medium text-foreground">{roles.join(", ") || "consulta"}</span>
        </p>
      </div>

      {!anyAdmin && !isAdmin && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold">Configuración inicial</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aún no hay administrador. Como eres el primer usuario, puedes tomar el rol de administrador para configurar áreas y permisos.
              </p>
              <Button className="mt-3" onClick={claimAdmin}>Convertirme en administrador</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Documentos visibles</p>
          <p className="mt-2 text-3xl font-semibold">{stats?.total ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Creados por mí</p>
          <p className="mt-2 text-3xl font-semibold">{stats?.mine ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/documents/new"><FilePlus className="mr-2 h-4 w-4" /> Registrar documento</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/documents"><FileText className="mr-2 h-4 w-4" /> Ver documentos</Link>
        </Button>
      </div>
    </div>
  );
}
