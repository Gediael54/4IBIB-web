import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { backend } from "../../backend";

interface MfaChallengeViewProps {
  factorId: string;
  onCompleted: () => void;
  onSignOut: () => void;
}

export default function MfaChallengeView({ factorId, onCompleted, onSignOut }: MfaChallengeViewProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const result = await backend.auth.challengeMfa(factorId);
        if (!cancelled) setChallengeId(result.challengeId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao consegui iniciar verificacao.");
        }
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [factorId]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeId || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await backend.auth.verifyMfaChallenge(factorId, challengeId, code.trim());
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mfa-screen">
      <div className="mfa-card mfa-card-compact">
        <div className="mfa-card-header">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <h1>Verificacao em 2 etapas</h1>
            <p className="muted">Digite o codigo de 6 digitos do seu app autenticador.</p>
          </div>
        </div>

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
              autoFocus
              required
              disabled={verifying}
              aria-invalid={error ? "true" : undefined}
            />
          </label>
          {error && <p className="mfa-error">{error}</p>}
          <div className="mfa-actions">
            <button type="submit" className="button primary" disabled={verifying || code.length !== 6}>
              {verifying ? "Validando..." : "Confirmar"}
            </button>
            <button type="button" className="button ghost" onClick={onSignOut}>
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
