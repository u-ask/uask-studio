import {
  ItemTypes,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { DeletePageSetCommand } from "./deletepagesetcommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1");
  b.pageSet("PS2").pages("P2");
  b.page("P1").question("Q1", "Q1", ItemTypes.yesno);
  b.page("P2").question("Q2", "Q2", ItemTypes.yesno);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview(survey.pageSets[0]).item("Q1").value(1);
  pb.interview(survey.pageSets[1]).item("Q2").value(1);
  const participant = pb.build();
  return { survey, participant };
}

test("Start delete pageset command #332", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new DeletePageSetCommand();
  command.start(mutableSurvey, mutableParticipant, 1);
  const item = mutableSurvey.pageSets[1].pages[0].items[0] as PageItem;
  t.equals(item.variableName, "__INFO_DELETION__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply delete pageSet command", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new DeletePageSetCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 1);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant);
  t.false(mutableSurvey.pageSets.some(ps => ps.type == "PS2"));
  t.false(mutableParticipant.interviews.some(i => i.pageSet.type == "PS2"));
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
