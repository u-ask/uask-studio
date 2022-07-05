import { ChoiceType, SurveyBuilder } from "uask-dom";
import test from "tape";
import { libUpdateMainWorkflow } from "./libupdatemainworkflow.js";

test("Add update workflow information", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libUpdateMainWorkflow(b, "updateWorkflow", survey);
  const parts = b.get();
  const partsVariableNames = [
    "__WORKFLOW_INITIAL__",
    "__WORKFLOW_FOLLOWUP__",
    "__WORKFLOW_AUXILIARY__",
    "__WORKFLOW_END__",
    "__WORKFLOW_PROCESS__",
  ];
  t.true(
    partsVariableNames.every(n => parts.items.find(p => p.variableName == n))
  );
  t.end();
});

test("Workflow library page set choices", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libUpdateMainWorkflow(b, "updateWorkflow", survey);
  const parts = b.get();
  const choices = parts.items.find(
    i => i.variableName == "__WORKFLOW_INITIAL__"
  )?.type as ChoiceType;
  t.deepEqual(choices.choices, ["PS1", "PS2"]);
  t.end();
});

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS0").translate("en", "PS0 (en)").translate("fr", "PS0 (fr)");
  b.pageSet("PS1").translate("en", "PS1 (en)").translate("fr", "PS1 (fr)");
  b.pageSet("PS2").translate("en", "PS2 (en)").translate("fr", "PS2 (fr)");
  b.workflow().home("PS0").initial("PS1").followUp("PS2");
  return b.get();
}
