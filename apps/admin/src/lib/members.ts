import type { Member } from "@4ibib/core";

export function findMemberByName(name: string, members: Member[]): Member | null {
  if (!name.trim()) return null;
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  return members.find((m) => m.fullName.toLocaleLowerCase("pt-BR") === normalized) ?? null;
}

export function sortMembersForAutocomplete(members: Member[]): Member[] {
  return [...members].sort((left, right) => {
    if (left.isVolunteer !== right.isVolunteer) {
      return left.isVolunteer ? -1 : 1;
    }
    return left.fullName.localeCompare(right.fullName, "pt-BR");
  });
}
