import test from "tape";
import {
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  Sample,
  SurveyBuilder,
} from "uask-dom";
import { DeletePageCommand } from "./deletepagecommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("Visit1").pages("P1", "P2");
  b.pageSet("Visit2").pages("P2", "P3");
  b.page("P1")
    .question("Q1", "Q1", b.types.real)
    .question("Q2", "Q2", b.types.real);
  b.page("P2")
    .question("Q3", "Q3", b.types.date(false))
    .question("Q4", "Q4", b.types.text);
  b.page("P3").question("Q5", "Q5", b.types.date(false));
  const survey = b.get();
  const pb = new ParticipantBuilder(survey, "0001", new Sample("1"));
  pb.interview(survey.pageSets[0])
    .item("Q1")
    .value(1)
    .item("Q2")
    .value(2)
    .item("Q3")
    .value(3)
    .item("Q4")
    .value(4);
  pb.interview(survey.pageSets[1])
    .item("Q3")
    .value(3.1)
    .item("Q4")
    .value(4.1)
    .item("Q5")
    .value(5.1);
  const participant = pb.build();
  return { survey, participant };
}

test("Start delete page command #331", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new DeletePageCommand();
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const item = mutableSurvey.pageSets[0].pages[0].items[0] as PageItem;
  t.equals(item.variableName, "__INFO_DELETION__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply delete workflow command #331", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeletePageCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 1, 0);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant);
  t.deepLooseEqual(
    mutableSurvey.pageSets[1].pages.map(p => p.name),
    ["P3"]
  );
  t.deepLooseEqual(
    mutableParticipant.interviews[1].items.map(i => i.pageItem.variableName),
    ["Q5"]
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
