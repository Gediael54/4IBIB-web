import { Copy, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { MfaEnrollment } from "@4ibib/core";
import { backend } from "../../backend";
import { useToast } from "../Toast";

interface MfaSetupViewProps {
  email: string;
  onCompleted: () => void;
  onSignOut: () => void;
}

export default function MfaSetupView({ email, onCompleted, onSignOut }: MfaSetupViewProps) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [loadingEnroll, setLoadingEnroll] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setLoadingEnroll(true);
      setError(null);
      try {
        // Re-use unverified factor if exists, otherwise enroll new
        const factors = await backend.auth.listMfaFactors();
        const existingUnverified = factors.find((f) => f.status === "unverified");
        if (existingUnverified) {
          await backend.auth.unenrollMfa(existingUnverified.id);
        }
        const next = await backend.auth.enrollMfa(`4IBIB Admin (${email})`);
        if (!cancelled) setEnrollment(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao consegui gerar o QR code.");
        }
      } finally {
        if (!cancelled) setLoadingEnroll(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [email]);

  async function handleCopySecret() {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast("Codigo secreto copiado.", { variant: "success" });
    } catch {
      toast("Nao consegui copiar — selecione e copie manualmente.", { variant: "danger" });
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await backend.auth.verifyMfaEnrollment(enrollment.factorId, code.trim());
      toast("MFA configurado com sucesso!", { variant: "success" });
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido. Tenta de novo.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mfa-screen">
      <div className="mfa-card">
        <div className="mfa-card-header">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <h1>Ativar verificacao em 2 etapas</h1>
            <p className="muted">
              Para sua seguranca, todos os admins precisam configurar autenticacao adicional.
            </p>
          </div>
        </div>

        <ol className="mfa-steps">
          <li>
            <strong>1. Instale um app autenticador</strong>
            <p>Recomendados: Google Authenticator, Microsoft Authenticator, Authy ou 1Password.</p>
          </li>
          <li>
            <strong>2. Escaneie o QR code abaixo</strong>
            {loadingEnroll && <p className="muted">Gerando QR code...</p>}
            {enrollment && (
              <div
                className="mfa-qrcode"
                aria-label="QR code para configurar MFA"
                dangerouslySetInnerHTML={{ __html: enrollment.qrCodeSvg }}
              />
            )}
            {enrollment && (
              <details className="mfa-secret">
                <summary>Nao consegue escanear? Use o codigo</summary>
                <div className="mfa-secret-row">
                  <code>{enrollment.secret}</code>
                  <button type="button" className="button ghost" onClick={handleCopySecret}>
                    <Copy size={16} aria-hidden="true" />
                    Copiar
                  </button>
                </div>
              </details>
            )}
          </li>
          <li>
            <strong>3. Digite o codigo de 6 digitos do app</strong>
            <form onSubmit={handleVerify} className="mfa-verify-form">
              <label className="mfa-code-input">
                <span className="field-label">Codigo</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  disabled={!enrollment || verifying}
                  aria-invalid={error ? "true" : undefined}
                />
              </label>
              {error && <p className="mfa-error">{error}</p>}
              <div className="mfa-actions">
                <button
                  type="submit"
                  className="button primary"
                  disabled={!enrollment || verifying || code.length !== 6}
                >
                  {verifying ? "Validando..." : "Confirmar"}
                </button>
                <button type="button" className="button ghost" onClick={onSignOut}>
                  Sair
                </button>
              </div>
            </form>
          </li>
        </ol>
      </div>
    </div>
  );
}
