import { Got } from "got/dist/source";
import {
  IAuditDriver,
  IDocumentDriver,
  IInterviewDriver,
  IParticipantDriver,
  IKpiDriver,
  ISurveyDriver,
  ISummaryDriver,
  IUserDriver,
  SummaryGenericDriver,
  IParticipantDeleteDriver,
  IInterviewDeleteDriver,
  ClientDrivers,
  ISampleDriver,
} from "uask-sys";
import { InterviewStudioDriver } from "./interviewstudio.js";
import { ParticipantStudioDriver } from "./participantstudio.js";
import { SurveyStudioDriver } from "./surveystudio.js";

export class StudioDrivers implements ClientDrivers {
  surveyDriver: ISurveyDriver;
  sampleDriver: ISampleDriver;
  participantDriver: IParticipantDriver & IParticipantDeleteDriver;
  interviewDriver: IInterviewDriver & IInterviewDeleteDriver;
  summaryDriver: ISummaryDriver;
  userDriver: IUserDriver;
  auditDriver: IAuditDriver;
  documentDriver: IDocumentDriver;
  kpiDriver: IKpiDriver;
  client: Got;

  constructor(drivers: ClientDrivers) {
    const surveyDriver = new SurveyStudioDriver(drivers.surveyDriver);
    this.surveyDriver = surveyDriver;
    this.sampleDriver = drivers.sampleDriver;
    this.participantDriver = new ParticipantStudioDriver(
      drivers.participantDriver
    );
    this.interviewDriver = new InterviewStudioDriver(
      drivers.interviewDriver,
      surveyDriver
    );
    this.summaryDriver = new SummaryGenericDriver(
      this.participantDriver,
      this.sampleDriver
    );
    this.userDriver = drivers.userDriver;
    this.auditDriver = drivers.auditDriver;
    this.documentDriver = drivers.documentDriver;
    this.kpiDriver = drivers.kpiDriver;
    this.client = drivers.client;
  }
}
