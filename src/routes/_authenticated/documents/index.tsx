import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePlus, Search, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({ meta: [{ title: "Documentos" }] }),
  component: DocumentsList,
});

function DocumentsList() {
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await supabase.from("areas").select("id, name, code").order("name")).data ?? [],
  });
  const { data: types } = useQuery({
    queryKey: ["types"],
    queryFn: async () => (await supabase.from("document_types").select("id, name").order("name")).data ?? [],
  });

  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<string>("all");
  const [typeId, setTypeId] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["documents", { q, areaId, typeId, year, from, to }],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("id, folio, subject, document_date, recipient, year, areas(name), document_types(name)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (areaId !== "all") query = query.eq("area_id", areaId);
      if (typeId !== "all") query = query.eq("type_id", typeId);
      if (year !== "all") query = query.eq("year", Number(year));
      if (from) query = query.gte("document_date", from);
      if (to) query = query.lte("document_date", to);
      if (q.trim()) {
        const term = q.trim().replace(/[%,]/g, "");
        query = query.or(`folio.ilike.%${term}%,subject.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - i);
  }, []);

  const hasFilters = q || areaId !== "all" || typeId !== "all" || year !== "all" || from || to;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos a los que tienes acceso.</p>
        </div>
        <Button asChild><Link to="/documents/new"><FilePlus className="mr-2 h-4 w-4" />Nuevo</Link></Button>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por folio o asunto…"
            className="pl-9"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Área</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {types?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Año</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setQ(""); setAreaId("all"); setTypeId("all"); setYear("all"); setFrom(""); setTo(""); }}
          >
            <X className="mr-1 h-3 w-3" />Limpiar filtros
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Folio</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Asunto</th>
              <th className="px-4 py-3 font-medium">Destinatario</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay documentos que coincidan.</td></tr>
            )}
            {data?.map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link to="/documents/$id" params={{ id: d.id }} className="text-primary hover:underline">
                    {d.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">{d.document_types?.name}</td>
                <td className="px-4 py-3">{d.areas?.name}</td>
                <td className="px-4 py-3">{d.subject}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.recipient || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.document_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
