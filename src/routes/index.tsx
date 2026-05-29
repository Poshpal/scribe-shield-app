import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { FileText, ShieldCheck, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control de Documentos" },
      { name: "description", content: "Sistema institucional para la numeración y control de oficios, memorandos, minutas y correos." },
    ],
  }),
  component: Index,
});

function Index() {
  const { isAuthenticated, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-semibold">Control de Documentos</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">Ingresar</Link>
            <Link to="/signup" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Registrarse</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Sistema institucional</span>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">
            Numeración y control de documentos, sin hojas de cálculo.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Registra oficios, memorandos, minutas, actas y correos con folio
            consecutivo automático por área y año. Cada usuario ve únicamente
            lo que le corresponde según su rol.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:bg-primary/90">
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center rounded-md border border-input bg-background px-5 py-3 font-medium hover:bg-accent">
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: "Folio automático", text: "Formato VE/OF/2026/0001, consecutivo por área, tipo y año." },
            { icon: ShieldCheck, title: "Roles y permisos", text: "Admin, capturista, supervisor y consulta con accesos diferenciados." },
            { icon: Users, title: "Multi-área", text: "Supervisores con acceso a varias áreas asignadas." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
