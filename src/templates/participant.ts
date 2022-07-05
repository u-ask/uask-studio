import {
  InterviewItem,
  PageSet,
  Participant,
  ParticipantBuilder,
  Sample,
} from "uask-dom";
import { SurveyTemplate } from "./survey.js";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ParticipantTemplate extends Participant {}

export class ParticipantTemplate {
  constructor(survey: SurveyTemplate, sample: Sample) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const participantBuilder = new ParticipantBuilder(survey, "", sample);
    participantBuilder.interview(survey.mainWorkflow.info as PageSet);
    participantBuilder
      .interview(survey.mainWorkflow.start)
      .item(new InterviewItem(survey.items[0], true))
      .item(new InterviewItem(survey.items[1], today));
    return participantBuilder.build();
  }
}
