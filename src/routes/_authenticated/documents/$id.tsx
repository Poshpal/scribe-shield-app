import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Documento" }] }),
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, areas(name, code), document_types(name, prefix)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: creator } = useQuery({
    queryKey: ["doc-creator", data?.created_by],
    enabled: !!data?.created_by,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_user_display", { _user_id: data!.created_by });
      if (error) throw error;
      return Array.isArray(rows) ? rows[0] : rows;
    },
  });

  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [docDate, setDocDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setSubject(data.subject ?? "");
      setRecipient(data.recipient ?? "");
      setSender(data.sender ?? "");
      setDocDate(data.document_date ?? "");
      setNotes(data.notes ?? "");
    }
  }, [data]);

  if (isLoading) {
    return <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-center text-muted-foreground">Cargando…</div>;
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Documento no encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Es posible que no exista o no tengas acceso.</p>
        <Button asChild className="mt-4"><Link to="/documents"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link></Button>
      </div>
    );
  }

  async function handleSave() {
    if (!subject.trim()) { toast.error("El asunto es obligatorio."); return; }
    setSaving(true);
    const { error } = await supabase.from("documents").update({
      subject,
      recipient: recipient || null,
      sender: sender || null,
      document_date: docDate,
      notes: notes || null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento actualizado.");
    setEditing(false);
    void refetch();
  }

  async function handleDelete() {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento eliminado.");
    void navigate({ to: "/documents" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/documents"><ArrowLeft className="mr-2 h-4 w-4" />Documentos</Link>
        </Button>
        {isAdmin && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El folio <span className="font-mono">{data.folio}</span> quedará liberado únicamente como hueco en la secuencia.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{data.folio}</h1>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {(data as any).document_types?.name}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Área: {(data as any).areas?.name} · Año: {data.year} · Secuencia #{data.sequence}
        </p>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-6">
        <Field label="Asunto">
          {editing ? <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} /> : <p>{data.subject}</p>}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Destinatario">
            {editing ? <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} /> : <p>{data.recipient || "—"}</p>}
          </Field>
          <Field label="Remitente">
            {editing ? <Input value={sender} onChange={(e) => setSender(e.target.value)} /> : <p>{data.sender || "—"}</p>}
          </Field>
        </div>
        <Field label="Fecha del documento">
          {editing ? <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} /> : <p>{data.document_date}</p>}
        </Field>
        <Field label="Notas">
          {editing ? <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} /> : <p className="whitespace-pre-wrap">{data.notes || "—"}</p>}
        </Field>

        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="text-sm">{children}</div>
    </div>
  );
}
