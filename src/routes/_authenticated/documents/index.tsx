import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({ meta: [{ title: "Documentos" }] }),
  component: DocumentsList,
});

function DocumentsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, folio, subject, document_date, recipient, areas(name), document_types(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos a los que tienes acceso.</p>
        </div>
        <Button asChild><Link to="/documents/new"><FilePlus className="mr-2 h-4 w-4" />Nuevo</Link></Button>
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay documentos registrados.</td></tr>
            )}
            {data?.map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{d.folio}</td>
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
