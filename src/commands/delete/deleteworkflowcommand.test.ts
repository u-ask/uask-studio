import test from "tape";
import {
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Participant,
  Sample,
  SurveyBuilder,
} from "uask-dom";
import { DeleteWorkflowCommand } from "./deleteworkflowcommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow()
    .home("SYNT")
    .initial("INIT")
    .followUp("FUP")
    .auxiliary("BIOCH")
    .end("END");
  b.workflow("participant").withPageSets("INIT", "FUP");
  b.workflow("INV").withPageSets("INIT", "FUP");
  b.pageSet("SYNT")
    .pageSet("INIT")
    .pageSet("FUP")
    .pageSet("BIOCH")
    .pageSet("END");
  const survey = b.get();
  const participant = new Participant("0001", new Sample("1"));
  return { survey, participant };
}

test("Start delete workflow command #333", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const command = new DeleteWorkflowCommand();
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const item = mutableSurvey.pageSets[0].pages[0].items[0] as PageItem;
  t.equals(item.variableName, "__INFO_DELETION__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply delete workflow command #333", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeleteWorkflowCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    1,
    0
  );
  const mutableSurvey = new MutableSurvey(survey);
  command.apply(mutableSurvey);
  t.equal(mutableSurvey.workflows[1].name, "INV");
  t.equal(mutableSurvey.workflows.length, 2);
  t.true(isConsistent(mutableSurvey, participant));
  t.end();
});
