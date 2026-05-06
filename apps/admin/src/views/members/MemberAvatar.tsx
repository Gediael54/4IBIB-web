import type { Member } from "@4ibib/core";

const COLOR_PALETTE = [
  { bg: "#FEE2E2", fg: "#991B1B" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#D1FAE5", fg: "#065F46" },
  { bg: "#DBEAFE", fg: "#1E40AF" },
  { bg: "#E9D5FF", fg: "#6B21A8" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#CFFAFE", fg: "#155E75" },
  { bg: "#FED7AA", fg: "#9A3412" }
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/u).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

interface MemberAvatarProps {
  member: Pick<Member, "id" | "fullName" | "preferredName" | "photoUrl">;
  size?: number;
}

export default function MemberAvatar({ member, size = 48 }: MemberAvatarProps) {
  const displayName = member.preferredName?.trim() || member.fullName;
  if (member.photoUrl) {
    return (
      <img
        className="member-avatar member-avatar-photo"
        src={member.photoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
      />
    );
  }
  const palette = COLOR_PALETTE[hashString(member.id) % COLOR_PALETTE.length];
  return (
    <span
      className="member-avatar member-avatar-initials"
      style={{ width: size, height: size, background: palette.bg, color: palette.fg }}
      aria-label={displayName}
    >
      {initials(displayName)}
    </span>
  );
}
