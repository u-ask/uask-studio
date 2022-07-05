import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libInsertDerivedWorkflow } from "./libinsertderivedworkflow.js";

test("Add update pageSet information", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libInsertDerivedWorkflow(b, "updatePageSet", survey);
  const parts = b.get();
  const partsVariableNames = ["__WORKFLOW_NAME__", "__WORKFLOW_SPECIFIER__"];
  t.true(
    partsVariableNames.every(n => parts.items.find(p => p.variableName == n))
  );
  t.end();
});

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS0").translate("en", "PS0 (en)").translate("fr", "PS0 (fr)");
  b.pageSet("PS1").translate("en", "PS1 (en)").translate("fr", "PS1 (fr)");
  b.pageSet("PS2").translate("en", "PS2 (en)").translate("fr", "PS2 (fr)");
  b.workflow().home("PS0").initial("PS1").followUp("PS2");
  b.workflow("participant").withPageSets("PS2");
  return b.get();
}
