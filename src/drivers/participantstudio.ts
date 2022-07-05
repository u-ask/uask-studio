import { Survey, Sample, Participant, isDomainProxy } from "uask-dom";
import { IParticipantDeleteDriver, IParticipantDriver } from "uask-sys";
import { ParticipantState } from "../state/index.js";

export class ParticipantStudioDriver
  implements IParticipantDriver, IParticipantDeleteDriver
{
  constructor(private readonly driver: IParticipantDriver) {}

  async getAll(survey: Survey, samples: Sample[]): Promise<Participant[]> {
    return await this.driver.getAll(survey, samples, { limit: 15 });
  }

  async getByParticipantCode(
    survey: Survey,
    samples: Sample[],
    participantCode: string
  ): Promise<Participant> {
    const participant = await this.driver.getByParticipantCode(
      survey,
      samples,
      participantCode
    );
    if (isDomainProxy(survey)) {
      const adapter = new ParticipantState(survey, participant);
      return adapter;
    }
    throw "domain object is not a proxy";
  }

  async getBySample(survey: Survey, sample: Sample): Promise<Participant[]> {
    return await this.driver.getBySample(survey, sample, { limit: 15 });
  }

  async save(
    survey: Survey,
    participant: Participant
  ): Promise<Partial<Participant>> {
    if (isDomainProxy(survey) && isDomainProxy(participant))
      return await this.driver.save(survey.value, participant.value);
    throw "domain object is not a proxy";
  }

  delete(): Promise<void> {
    throw new Error("Delete not supported by studio drivers.");
  }
}
