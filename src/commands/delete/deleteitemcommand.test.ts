import {
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  Sample,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { DeleteItemCommand } from "./deleteitemcommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("Visit1").pages("P1");
  b.page("P1")
    .question("Q1", "Q1", b.types.real)
    .question("Q2", "Q2", b.types.real);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey, "0001", new Sample("1"));
  pb.interview(survey.pageSets[0]).item("Q1").value(1.0).item("Q2").value(2.0);
  const participant = pb.build();
  return { survey, participant };
}

test("Start delete item command #330", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeleteItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  t.equal(
    (mutableSurvey.value.pages[0].items[1] as PageItem).variableName,
    "__INFO_DELETION__"
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Start delete item command with count #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeleteItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0, 2);
  t.equal(
    (mutableSurvey.value.pages[0].items[2] as PageItem).variableName,
    "__INFO_DELETION__"
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("apply delete item command #330", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeleteItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 0);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant);
  t.equal(mutableSurvey.items.length, 1);
  t.equal(mutableSurvey.pages[0].items.length, 1);
  t.equal(mutableParticipant.interviews[0].items.length, 1);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("apply delete item command with count #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeleteItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 0, 2);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant);
  t.equal(mutableSurvey.items.length, 0);
  t.equal(mutableSurvey.pages[0].items.length, 0);
  t.equal(mutableParticipant.interviews[0].items.length, 0);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
