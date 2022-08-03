import {
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Survey,
} from "uask-dom";

export interface IMutationCommand<S extends unknown[] = unknown[]> {
  pageSetIndex?: number;
  pageIndex?: number;
  pageItemIndex?: number;

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    ...args: S
  ): void;
  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void;
  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

export class NullCommand implements IMutationCommand {
  pageSetIndex = 0;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  start(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  apply(): void {}

  canApply(): boolean {
    return true;
  }
}

export function allRequiredSet(
  pageItems: PageItem[],
  interviewItems: InterviewItem[]
): boolean {
  return allSet(pageItems, interviewItems, "required");
}

export function allUniqueSet(
  pageItems: PageItem[],
  interviewItems: InterviewItem[]
): boolean {
  return allSet(pageItems, interviewItems, "unique");
}

function allSet(
  pageItems: PageItem[],
  interviewItems: InterviewItem[],
  ruleName: string
): boolean {
  return interviewItems.every(
    p => !pageItems.includes(p.pageItem) || !(ruleName in p.messages)
  );
}

export function allInRangeSet(
  parts: PageItem[],
  interviewItems: InterviewItem[]
): boolean {
  return allSet(parts, interviewItems, "unique");
}

export function allLanguagesSet(
  parts: PageItem[],
  interviewItems: InterviewItem[]
): boolean {
  return allSet(parts, interviewItems, "allLanguages");
}
