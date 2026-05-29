import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const ROLES = ["admin", "capturista", "supervisor", "consulta"] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administración" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuthContext();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) void navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  const { data: areas } = useQuery({
    queryKey: ["admin-areas"],
    queryFn: async () => (await supabase.from("areas").select("*").order("code")).data ?? [],
  });
  const { data: types } = useQuery({
    queryKey: ["admin-types"],
    queryFn: async () => (await supabase.from("document_types").select("*").order("name")).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email, area_id");
      const { data: rls } = await supabase.from("user_roles").select("user_id, role");
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (rls ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const [newArea, setNewArea] = useState({ code: "", name: "" });
  const [newType, setNewType] = useState({ code: "", name: "", prefix: "" });

  async function addArea() {
    if (!newArea.code || !newArea.name) return;
    const { error } = await supabase.from("areas").insert(newArea);
    if (error) return toast.error(error.message);
    setNewArea({ code: "", name: "" });
    qc.invalidateQueries({ queryKey: ["admin-areas"] });
    toast.success("Área creada");
  }
  async function delArea(id: string) {
    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-areas"] });
  }
  async function addType() {
    if (!newType.code || !newType.name || !newType.prefix) return;
    const { error } = await supabase.from("document_types").insert(newType);
    if (error) return toast.error(error.message);
    setNewType({ code: "", name: "", prefix: "" });
    qc.invalidateQueries({ queryKey: ["admin-types"] });
    toast.success("Tipo creado");
  }
  async function delType(id: string) {
    const { error } = await supabase.from("document_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-types"] });
  }
  async function setUserArea(userId: string, areaId: string | null) {
    const { error } = await supabase.from("profiles").update({ area_id: areaId }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  async function toggleRole(userId: string, role: string, has: boolean) {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Administración</h1>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Áreas / Vocalías</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]">
          <Input placeholder="Código (ej. VE)" value={newArea.code} onChange={(e) => setNewArea({ ...newArea, code: e.target.value.toUpperCase() })} />
          <Input placeholder="Nombre" value={newArea.name} onChange={(e) => setNewArea({ ...newArea, name: e.target.value })} />
          <Button onClick={addArea}>Agregar</Button>
        </div>
        <ul className="mt-4 divide-y">
          {areas?.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="font-mono text-xs text-muted-foreground">{a.code}</span> — {a.name}</span>
              <Button size="sm" variant="ghost" onClick={() => delArea(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Tipos de documento</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_140px_auto]">
          <Input placeholder="Código" value={newType.code} onChange={(e) => setNewType({ ...newType, code: e.target.value })} />
          <Input placeholder="Nombre" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} />
          <Input placeholder="Prefijo folio" value={newType.prefix} onChange={(e) => setNewType({ ...newType, prefix: e.target.value.toUpperCase() })} />
          <Button onClick={addType}>Agregar</Button>
        </div>
        <ul className="mt-4 divide-y">
          {types?.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="font-mono text-xs text-muted-foreground">{t.prefix}</span> — {t.name}</span>
              <Button size="sm" variant="ghost" onClick={() => delType(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Usuarios, áreas y roles</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Usuario</th>
                <th className="py-2 pr-4 font-medium">Área principal</th>
                <th className="py-2 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.id} className="border-b align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{u.full_name || "(sin nombre)"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="py-3 pr-4 w-64">
                    <Select value={u.area_id ?? "none"} onValueChange={(v) => setUserArea(u.id, v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sin área —</SelectItem>
                        {areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            onClick={() => toggleRole(u.id, r, has)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              has ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
