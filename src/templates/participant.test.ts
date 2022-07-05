import { Sample } from "uask-dom";
import test from "tape";
import { ParticipantTemplate } from "./participant.js";
import { SurveyTemplate } from "./survey.js";

test("Create a participant for the given template #366", t => {
  const survey = new SurveyTemplate("TEST-1");
  const participant = new ParticipantTemplate(survey, new Sample(""));
  t.deepLooseEqual(
    participant.interviews.map(i => i.pageSet),
    [survey.mainWorkflow.info, survey.mainWorkflow.start]
  );
  t.end();
});
