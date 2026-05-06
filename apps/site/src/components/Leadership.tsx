import { useQuery } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";
import type { ChurchRole, Member } from "@4ibib/core";
import { backend } from "../backend";
import PictureSet from "./PictureSet";

type LeadershipRole = "pastor" | "pastor_auxiliar" | "presbitero" | "diacono";

const LEADERSHIP_ROLES: readonly LeadershipRole[] = ["pastor", "pastor_auxiliar", "presbitero", "diacono"];

const LEADERSHIP_ROLE_LABELS: Record<LeadershipRole, string> = {
  pastor: "Pastor",
  pastor_auxiliar: "Pastor auxiliar",
  presbitero: "Presbitero",
  diacono: "Diacono"
};

const ROLE_ORDER: Record<LeadershipRole, number> = {
  pastor: 0,
  pastor_auxiliar: 1,
  presbitero: 2,
  diacono: 3
};

function isLeadershipRole(role: ChurchRole): role is LeadershipRole {
  return (LEADERSHIP_ROLES as readonly ChurchRole[]).includes(role);
}

function displayName(member: Member): string {
  return member.preferredName.trim() || member.fullName;
}

function isPictureSetCandidate(url: string): boolean {
  return url.toLowerCase().endsWith(".jpg");
}

export function sortLeadership(items: Member[]): Member[] {
  return [...items].sort((left, right) => {
    const leftRole = isLeadershipRole(left.churchRole) ? ROLE_ORDER[left.churchRole] : 99;
    const rightRole = isLeadershipRole(right.churchRole) ? ROLE_ORDER[right.churchRole] : 99;
    if (leftRole !== rightRole) {
      return leftRole - rightRole;
    }
    return displayName(left).localeCompare(displayName(right));
  });
}

export function filterLeadership(items: Member[]): Member[] {
  return items.filter(
    (member) => member.publicDirectory && member.deletedAt === null && isLeadershipRole(member.churchRole)
  );
}

export interface LeadershipProps {
  members: Member[];
}

export function LeadershipList({ members }: LeadershipProps) {
  const visible = sortLeadership(filterLeadership(members));

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="section" id="lideranca">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pastores e lideranca</p>
          <h2>Lideranca</h2>
        </div>
        <HeartHandshake />
      </div>
      <div className="leadership-grid">
        {visible.map((member) => {
          const roleLabel = isLeadershipRole(member.churchRole)
            ? LEADERSHIP_ROLE_LABELS[member.churchRole]
            : "";
          return (
            <article className="leadership-card" key={member.id}>
              {member.photoUrl &&
                (isPictureSetCandidate(member.photoUrl) ? (
                  <PictureSet src={member.photoUrl} alt={displayName(member)} loading="lazy" />
                ) : (
                  <img src={member.photoUrl} alt={displayName(member)} loading="lazy" />
                ))}
              <div className="leadership-card-body">
                <span className="leadership-card-role">{roleLabel}</span>
                <h3>{displayName(member)}</h3>
                {member.publicBio && <p>{member.publicBio}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Leadership() {
  const { data: members } = useQuery({
    queryKey: ["leadership"],
    queryFn: () => backend.content.listMembers()
  });

  return <LeadershipList members={members ?? []} />;
}
