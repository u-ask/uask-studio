import { getTranslation } from "uask-dom";
import { SurveyTemplate } from "./survey.js";
import test from "tape";

test("Create a new survey #366", t => {
  const newSurvey = new SurveyTemplate("NEWSTUD");
  t.ok(!!newSurvey.mainWorkflow);
  t.equal(newSurvey.pageSets.length, 2);
  t.deepLooseEqual(
    newSurvey.pageSets.map(ps => getTranslation(ps.type, "__code__")),
    ["SYNT", "INC"]
  );
  t.end();
});
