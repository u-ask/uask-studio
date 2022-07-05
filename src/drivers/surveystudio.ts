import { isDomainProxy, Survey } from "uask-dom";
import { ISurveyDriver } from "uask-sys";
import { SurveyState } from "../state/index.js";

export class SurveyStudioDriver implements ISurveyDriver {
  constructor(private readonly driver: ISurveyDriver) {}

  async getByName(name: string): Promise<Survey> {
    const survey = await this.driver.getByName(name);
    return new SurveyState(survey);
  }

  async save(survey: Survey | SurveyState): Promise<Partial<Survey>> {
    if (isDomainProxy(survey)) return await this.driver.save(survey.value);
    throw "domain object is not a proxy";
  }
}
