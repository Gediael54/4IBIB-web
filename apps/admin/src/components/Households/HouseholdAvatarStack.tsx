import type { Member } from "@4ibib/core";

interface HouseholdAvatarStackProps {
  members: Member[];
  max?: number;
  ariaLabel?: string;
}

const PALETTE = [
  { background: "#fde68a", color: "#7c2d12" },
  { background: "#bae6fd", color: "#075985" },
  { background: "#fbcfe8", color: "#9d174d" },
  { background: "#bbf7d0", color: "#166534" },
  { background: "#ddd6fe", color: "#5b21b6" },
  { background: "#fecaca", color: "#7f1d1d" },
  { background: "#a5f3fc", color: "#155e75" },
  { background: "#fed7aa", color: "#9a3412" }
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

function initialsFor(member: Member): string {
  const source = (member.preferredName || member.fullName || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/u).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export default function HouseholdAvatarStack({ members, max = 5, ariaLabel }: HouseholdAvatarStackProps) {
  if (members.length === 0) return null;
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className="household-avatar-stack" role="group" aria-label={ariaLabel}>
      {visible.map((member) => {
        const palette = paletteFor(member.id);
        const initials = initialsFor(member);
        const displayName = member.preferredName || member.fullName;
        return (
          <span
            key={member.id}
            className="household-avatar"
            title={displayName}
            aria-label={displayName}
            style={{ background: palette.background, color: palette.color }}
          >
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="" loading="lazy" />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="household-avatar household-avatar-overflow"
          aria-label={`Mais ${overflow} membros`}
          title={`Mais ${overflow} membros`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
