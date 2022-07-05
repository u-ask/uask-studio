import {
  Survey,
  Participant,
  Interview,
  IDomainCollection,
  InterviewItem,
  isDomainProxy,
} from "uask-dom";
import {
  IInterviewDeleteDriver,
  IInterviewDriver,
  PartialInterview,
} from "uask-sys";
import { getApplyItem } from "../commands/index.js";
import { IStudioState, ParticipantState, StudioState } from "../state/index.js";
import { SurveyStudioDriver } from "./surveystudio.js";

export class InterviewStudioDriver
  implements IInterviewDriver, IInterviewDeleteDriver
{
  constructor(
    private readonly driver: IInterviewDriver,
    private readonly surveyDriver: SurveyStudioDriver
  ) {}

  async save(
    survey: Survey,
    participant: Participant,
    interview: Interview,
    items: IDomainCollection<InterviewItem> = interview.items
  ): Promise<PartialInterview> {
    if (isDomainProxy(survey) && isDomainProxy(participant)) {
      const state = participant as ParticipantState as IStudioState;
      return this.tryApplyState(state, survey, participant, items);
    }
    throw "domain object is not a proxy";
  }

  private async tryApplyState(
    state: IStudioState,
    survey: Survey,
    participant: Participant,
    items: IDomainCollection<InterviewItem>
  ): Promise<PartialInterview> {
    if (this.canApply(state, [...items])) {
      const results = state.apply([...items]);
      return this.saveSurvey(state, survey, participant, results.interview);
    }
    return [{}, { items: [] }];
  }

  canApply(state: StudioState, items: InterviewItem[]): boolean {
    const applyItem = getApplyItem(items);
    return (
      typeof applyItem != "undefined" &&
      applyItem.value == true &&
      state.canApply([...items])
    );
  }

  private async saveSurvey(
    state: IStudioState,
    survey: Survey,
    participant: Participant,
    interview: Interview
  ): Promise<PartialInterview> {
    const pending = this.surveyDriver.save(survey);
    if (interview.nonce == 0) {
      await pending;
      return this.saveInterview(state, survey, participant, interview);
    }
    return [interview, { items: [] }];
  }

  private async saveInterview(
    state: IStudioState,
    survey: Survey,
    participant: Participant,
    interview: Interview
  ): Promise<PartialInterview> {
    const keys = await this.driver.save(survey, participant, interview);
    const nonced = state.init(keys);
    return [nonced, { items: [] }];
  }

  delete(): Promise<void> {
    throw new Error("Delete not supported by studio drivers.");
  }
}
