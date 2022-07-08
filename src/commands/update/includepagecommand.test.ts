import test from "tape";
import {
  getItem,
  InterviewItem,
  Library,
  MutableParticipant,
  MutableSurvey,
  ParticipantBuilder,
  SurveyBuilder,
} from "uask-dom";
import { IncludePageCommand } from "./includepagecommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1");
  b.pageSet("PS2").pages("P2");
  b.page("P1")
    .question("Q1.1", "Q11", b.types.yesno)
    .question("Q1.2", "Q12", b.types.yesno);
  b.page("P2")
    .question("Q2.1", "Q21", b.types.yesno)
    .include("P3")
    .question("Q2.2", "Q22", b.types.yesno);
  b.page("P3")
    .question("Q3.1", "Q31", b.types.yesno)
    .question("Q3.2", "Q32", b.types.yesno);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q11").value(1).item("Q12").value(0);
  pb.interview("PS2").item("Q21").value(1).item("Q22").value(0);
  const participant = pb.build();
  return { survey, participant };
}

test("Start add include page command #386", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new IncludePageCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0);
  const items = mutableParticipant.interviews[0].items;
  t.equal(items[2].pageItem, command.includePart);
  t.equal(items[3].pageItem, command.pageCodePart);
  t.equal(items[4].pageItem, command.selectorParts.P1);
  t.equal(items[5].pageItem, command.selectorParts.P2);
  t.equal(items[6].pageItem, command.selectorParts.P3);
  t.equal(items[7].pageItem, command.contextPart);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Start modify include page command #386", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new IncludePageCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 1);
  const items = mutableParticipant.interviews[1].items;
  t.equal(items[4].value, 1);
  t.equal(items[5].value, "P3");
  t.equal(items[6].value, undefined);
  t.equal(items[7].value, undefined);
  t.deepEqual(items[8].value, ["Q31", "Q32"]);
  t.equal(items[9].value, undefined);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply add include page command #386", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new IncludePageCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0
  );
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);

  const items = [
    new InterviewItem(command.includePart, 1),
    new InterviewItem(command.pageCodePart, "P2"),
    new InterviewItem(command.selectorParts.P1, undefined),
    new InterviewItem(command.selectorParts.P2, ["Q22", "Q32"]),
    new InterviewItem(command.selectorParts.P3, undefined),
    new InterviewItem(command.contextPart, 2),
  ];
  command.apply(mutableSurvey, mutableParticipant, items);
  const expected = new Library(
    survey.pages[1],
    survey.pages[1].items.slice(2).map(i => getItem(i)),
    survey.pages[1].items
      .slice(2)
      .map(i => ({ pageItem: getItem(i), context: 1 }))
  );
  t.deepEqual(mutableSurvey.pages[0].includes[2], expected);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply modify include page command #386", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new IncludePageCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    1
  );
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);

  const items = [
    new InterviewItem(command.includePart, 1),
    new InterviewItem(command.pageCodePart, "P1"),
    new InterviewItem(command.selectorParts.P1, ["Q12"]),
    new InterviewItem(command.selectorParts.P2, undefined),
    new InterviewItem(command.selectorParts.P3, undefined),
    new InterviewItem(command.contextPart, 3),
  ];
  command.apply(mutableSurvey, mutableParticipant, items);
  const expected = new Library(
    survey.pages[0],
    survey.pages[0].items.slice(1).map(i => getItem(i)),
    survey.pages[0].items
      .slice(1)
      .map(i => ({ pageItem: getItem(i), context: 2 }))
  );
  t.deepEqual(mutableSurvey.pages[1].includes[1], expected);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Can apply an include page command #386", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new IncludePageCommand();
  const mutableSurvey = new MutableSurvey(survey);
  command.start(mutableSurvey, new MutableParticipant(participant), 0);

  const cannotApply = command.canApply(mutableSurvey, [
    new InterviewItem(command.pageCodePart, undefined, {
      messages: { required: "value is required" },
    }),
  ]);
  t.false(cannotApply);

  const items = [new InterviewItem(command.pageCodePart, "P2")];
  const canApply = command.canApply(mutableSurvey, items);
  t.true(canApply);
  t.end();
});
