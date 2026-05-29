import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents/new")({
  head: () => ({ meta: [{ title: "Nuevo documento" }] }),
  component: NewDocument,
});

function NewDocument() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, hasRole } = useAuthContext();
  const canCreate = isAdmin || hasRole("capturista");

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await supabase.from("areas").select("id, name, code").order("name")).data ?? [],
  });
  const { data: types } = useQuery({
    queryKey: ["types"],
    queryFn: async () => (await supabase.from("document_types").select("id, name, prefix, restricted_area_id").order("name")).data ?? [],
  });

  const [areaId, setAreaId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Default area to user's own
  if (!areaId && profile?.area_id) setAreaId(profile.area_id);

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Sin permisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tu rol no permite registrar documentos. Solicita el rol de capturista a un administrador.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!areaId || !typeId || !subject) { toast.error("Completa los campos requeridos."); return; }
    setSaving(true);
    const { data, error } = await supabase.from("documents").insert({
      area_id: areaId,
      type_id: typeId,
      subject,
      recipient: recipient || null,
      sender: sender || null,
      document_date: docDate,
      notes: notes || null,
      created_by: user!.id,
      year: new Date(docDate).getFullYear(),
      sequence: 0, // overwritten by trigger
      folio: "AUTO", // overwritten by trigger
    } as any).select("folio").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Documento registrado: ${data?.folio}`);
    void navigate({ to: "/documents" });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Registrar documento</h1>
      <p className="mt-1 text-sm text-muted-foreground">El folio se genera automáticamente al guardar.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Área</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="Selecciona área" /></SelectTrigger>
              <SelectContent>
                {areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                {types
                  ?.filter((t: any) => !t.restricted_area_id || t.restricted_area_id === areaId)
                  .map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(() => {
              const t: any = types?.find((x) => x.id === typeId);
              if (t?.restricted_area_id && t.restricted_area_id !== areaId) {
                return <p className="text-xs text-destructive">Este tipo solo puede crearse desde el área autorizada.</p>;
              }
              return null;
            })()}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Asunto</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={300} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Destinatario</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Remitente</Label>
            <Input value={sender} onChange={(e) => setSender(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fecha del documento</Label>
          <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar y generar folio"}
        </Button>
      </form>
    </div>
  );
}
