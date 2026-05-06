import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import type { MfaAssurance, MfaFactor } from "@4ibib/core";
import { backend } from "../../backend";
import MfaChallengeView from "./MfaChallengeView";
import MfaSetupView from "./MfaSetupView";

interface MfaGuardProps {
  email: string;
  onSignOut: () => void;
  children: ReactNode;
}

type GuardState =
  | { kind: "loading" }
  | { kind: "passed" }
  | { kind: "challenge"; factorId: string }
  | { kind: "setup" }
  | { kind: "error"; message: string };

export default function MfaGuard({ email, onSignOut, children }: MfaGuardProps) {
  const [state, setState] = useState<GuardState>({ kind: "loading" });
  const [evaluateNonce, setEvaluateNonce] = useState(0);

  function reEvaluate() {
    setEvaluateNonce((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [assurance, factors] = await Promise.all<[Promise<MfaAssurance>, Promise<MfaFactor[]>]>([
          backend.auth.getAuthAssuranceLevel(),
          backend.auth.listMfaFactors()
        ]);
        if (cancelled) return;
        const verifiedFactor = factors.find((factor) => factor.status === "verified");
        if (assurance.current === "aal2") {
          setState({ kind: "passed" });
          return;
        }
        if (verifiedFactor) {
          setState({ kind: "challenge", factorId: verifiedFactor.id });
          return;
        }
        setState({ kind: "setup" });
      } catch (error) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Nao consegui verificar o status MFA."
        });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [evaluateNonce]);

  if (state.kind === "loading") {
    return (
      <div className="mfa-screen">
        <div className="mfa-card mfa-card-compact mfa-card-loading">
          <LoaderCircle className="mfa-spinner" size={28} aria-hidden="true" />
          <p>Verificando seguranca...</p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mfa-screen">
        <div className="mfa-card mfa-card-compact">
          <h1>Falha de seguranca</h1>
          <p className="mfa-error">{state.message}</p>
          <div className="mfa-actions">
            <button type="button" className="button primary" onClick={reEvaluate}>
              Tentar de novo
            </button>
            <button type="button" className="button ghost" onClick={onSignOut}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "challenge") {
    return <MfaChallengeView factorId={state.factorId} onCompleted={reEvaluate} onSignOut={onSignOut} />;
  }

  if (state.kind === "setup") {
    return <MfaSetupView email={email} onCompleted={reEvaluate} onSignOut={onSignOut} />;
  }

  return <>{children}</>;
}
