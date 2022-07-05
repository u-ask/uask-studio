import {
  Participant,
  IDomainCollection,
  InterviewItem,
  Survey,
  getItem,
  Interview,
  SurveyBuilder,
} from "uask-dom";
import { libApply } from "./libapply.js";

export function getStudioItems(
  studioParticipant: Participant,
  participant: Participant,
  interviewIndex = 0
): IDomainCollection<InterviewItem> {
  return studioParticipant.interviews[interviewIndex].items.filter(
    i => !participant.interviews[interviewIndex].items.includes(i)
  );
}

export function isConsistent(survey: Survey, participant: Participant): boolean {
  return participant.interviews.every(
    i =>
      survey.pageSets.includes(i.pageSet) &&
      i.items.every(t => survey.items.some(tt => getItem(t) == getItem(tt)))
  );
}

export function completeInterview(
  items: IDomainCollection<InterviewItem>
): IDomainCollection<InterviewItem>;
export function completeInterview(items: InterviewItem[]): InterviewItem[];
export function completeInterview(interview: Interview): Interview;
export function completeInterview(
  x: InterviewItem[] | IDomainCollection<InterviewItem> | Interview
): InterviewItem[] | IDomainCollection<InterviewItem> | Interview {
  if (x instanceof Interview)
    return x.update({ items: completeInterview(x.items) });
  const b = new SurveyBuilder();
  libApply(b, "apply");
  const [applyItem] = b.get().items;
  const applyMarker = new InterviewItem(applyItem, true);
  return x.concat(applyMarker);
}
