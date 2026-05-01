import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ChurchProfile, MinistryRecord, RecurringMeetingRecord } from "@4ibib/core";
import { CHURCH, MINISTRIES, REGULAR_MEETINGS } from "../config/church";
import type { Ministry, RegularMeeting } from "../config/church";
import {
  resolveMinistries,
  resolveProfile,
  resolveRegularMeetings,
  type ResolvedChurch
} from "./resolve-church";

interface ChurchContextValue {
  church: ResolvedChurch;
  regularMeetings: RegularMeeting[];
  ministries: Ministry[];
}

const DEFAULT_VALUE: ChurchContextValue = {
  church: CHURCH,
  regularMeetings: REGULAR_MEETINGS,
  ministries: MINISTRIES
};

const ChurchContext = createContext<ChurchContextValue>(DEFAULT_VALUE);

export interface ChurchProviderProps {
  profile: ChurchProfile | null | undefined;
  ministries: MinistryRecord[] | null | undefined;
  recurringMeetings: RecurringMeetingRecord[] | null | undefined;
  children: ReactNode;
}

export function ChurchProvider({ profile, ministries, recurringMeetings, children }: ChurchProviderProps) {
  const value = useMemo<ChurchContextValue>(
    () => ({
      church: resolveProfile(profile),
      regularMeetings: resolveRegularMeetings(recurringMeetings),
      ministries: resolveMinistries(ministries)
    }),
    [profile, ministries, recurringMeetings]
  );
  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
}

export function useChurchProfile(): ResolvedChurch {
  return useContext(ChurchContext).church;
}

export function useRegularMeetings(): RegularMeeting[] {
  return useContext(ChurchContext).regularMeetings;
}

export function useMinistries(): Ministry[] {
  return useContext(ChurchContext).ministries;
}
