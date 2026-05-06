import { Crown, Mail, Phone, Trash2 } from "lucide-react";
import type { Member } from "@4ibib/core";
import DataCard from "../../components/Layout/DataCard";
import { CHURCH_ROLE_LABELS, MEMBERSHIP_STATUS_LABELS } from "../../lib/labels";
import MemberAvatar from "./MemberAvatar";

interface MemberCardProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

const LEADERSHIP_ROLES = new Set(["pastor", "pastor_auxiliar", "presbitero", "diacono"]);

function calculateAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return `${age} anos`;
}

export default function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const displayName = member.preferredName?.trim() || member.fullName;
  const age = calculateAge(member.birthDate);
  const isLeadership = LEADERSHIP_ROLES.has(member.churchRole);
  const status =
    member.membershipStatus === "ativo"
      ? "default"
      : member.membershipStatus === "falecido"
        ? "muted"
        : "warning";

  return (
    <DataCard
      icon={<MemberAvatar member={member} />}
      iconBackground="transparent"
      iconColor="inherit"
      title={
        <span className="member-card-title">
          {isLeadership && <Crown size={14} aria-hidden="true" className="member-card-crown" />}
          {displayName}
        </span>
      }
      badge={CHURCH_ROLE_LABELS[member.churchRole]}
      subtitle={
        <>
          {age && <>{age} · </>}
          {MEMBERSHIP_STATUS_LABELS[member.membershipStatus]}
          {member.isVolunteer && <> · Voluntário</>}
        </>
      }
      meta={
        <>
          {member.phone && (
            <span>
              <Phone size={12} aria-hidden="true" /> {member.phone}
            </span>
          )}
          {member.email && (
            <span>
              <Mail size={12} aria-hidden="true" /> {member.email}
            </span>
          )}
        </>
      }
      status={status}
      secondaryActions={
        <>
          <button type="button" className="button ghost" onClick={() => onEdit(member)}>
            Editar
          </button>
          <button
            type="button"
            className="icon-button danger"
            onClick={() => onDelete(member)}
            aria-label={`Arquivar ${member.fullName}`}
            title="Arquivar"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
