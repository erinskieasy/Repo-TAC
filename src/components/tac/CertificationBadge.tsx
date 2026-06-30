import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  Shield,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import {
  rubricPasses,
  type CertSignOff,
  type CertStatus,
  type Criterion,
  type DashboardView,
} from "./certification";

type StatusMeta = {
  label: string; // badge text
  title: string; // panel heading
  icon: LucideIcon;
};

const STATUS_META: Record<CertStatus, StatusMeta> = {
  certified: { label: "T.A.C Certified", title: "Certified", icon: Check },
  expiring: { label: "Certified · expiring", title: "Certification expiring", icon: Clock },
  ready: { label: "Ready to certify", title: "Ready to certify", icon: ShieldCheck },
  expired: { label: "Certification expired", title: "Certification expired", icon: TriangleAlert },
  lapsed: { label: "Certification lapsed", title: "Certification lapsed", icon: TriangleAlert },
  "not-eligible": { label: "Not certified", title: "Not certified", icon: Shield },
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CertificationBadge({
  status,
  onOpen,
}: {
  status: CertStatus;
  onOpen: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      className={`tac-certified-badge overview-certified-badge is-${status}`}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <Icon aria-hidden="true" />
      <span>{meta.label}</span>
    </button>
  );
}

export function CertificationPanel({
  status,
  rubric,
  signOff,
  reporting,
  onCertify,
  onRevoke,
  onClose,
  onNavigate,
}: {
  status: CertStatus;
  rubric: Criterion[];
  signOff: CertSignOff | null;
  reporting: { filed: number; required: number };
  onCertify: () => void;
  onRevoke: () => void;
  onClose: () => void;
  onNavigate: (view: DashboardView) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const allPass = rubricPasses(rubric);

  const subline =
    signOff && (status === "certified" || status === "expiring" || status === "expired")
      ? `Certified by ${signOff.certifiedBy} on ${formatDate(signOff.certifiedAt)} · valid through ${formatDate(signOff.validUntil)}`
      : status === "lapsed"
        ? "A criterion regressed since sign-off — re-certify once the checks pass again."
        : status === "ready"
          ? "All checks pass. A lead can certify this project."
          : "Meet every check below, then a lead can certify.";

  return (
    <div className="certification-layer" role="presentation">
      <button
        className="certification-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Close certification panel"
        onClick={onClose}
      />
      <section
        className={`certification-panel is-${status}`}
        role="dialog"
        aria-modal="true"
        aria-label="T.A.C certification status"
      >
        <header className="certification-header">
          <div className={`certification-status-chip is-${status}`}>
            <StatusIcon aria-hidden="true" />
            <span>{meta.title}</span>
          </div>
          <button
            className="certification-close"
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <p className="certification-subline">{subline}</p>

        <ul className="certification-criteria">
          {rubric.map((criterion) => (
            <li
              key={criterion.id}
              className={criterion.passed ? "certification-criterion is-pass" : "certification-criterion is-fail"}
            >
              <span className="certification-criterion-mark" aria-hidden="true">
                {criterion.passed ? <Check /> : <X />}
              </span>
              <div className="certification-criterion-body">
                <div className="certification-criterion-top">
                  <strong>{criterion.label}</strong>
                  <span className="certification-criterion-detail">{criterion.detail}</span>
                </div>
                {!criterion.passed ? (
                  <div className="certification-criterion-fix">
                    <span>{criterion.hint}</span>
                    <button type="button" onClick={() => onNavigate(criterion.targetView)}>
                      <span>Go</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="certification-context">
          <span>Reporting (not required for certification)</span>
          <strong>
            {reporting.filed}/{reporting.required} check-ins filed
          </strong>
        </div>

        <footer className="certification-footer">
          {signOff ? (
            <button className="certification-revoke" type="button" onClick={onRevoke}>
              Revoke certification
            </button>
          ) : (
            <span />
          )}
          <button
            className="certification-certify"
            type="button"
            disabled={!allPass}
            title={allPass ? undefined : "Resolve every check before certifying."}
            onClick={onCertify}
          >
            <BadgeCheck aria-hidden="true" />
            <span>{signOff ? "Re-certify" : "Certify project"}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}
