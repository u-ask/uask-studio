import {
  CrossItemRule,
  DomainCollection,
  execute,
  IDomainCollection,
  Interview,
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  Scope,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { InsertItemCommand } from "./insertitemcommand.js";
import { UpdateItemCommand } from "../update/updateitemcommand.js";
import { getStudioItems, isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1");
  b.page("P1")
    .question("Question 1", "Q1", b.types.text)
    .question("Question 2", "Q2", b.types.integer);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q1").value("A").item("Q2").value(2);
  const participant = pb.build();
  return { survey, participant };
}

test("Start item insert command", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  t.equal(
    (mutableSurvey.value.pages[0].items[0] as PageItem).variableName,
    "NEW_ITEM"
  );
  t.equal(
    (mutableSurvey.value.pages[0].items[1] as PageItem).variableName,
    "__ITEM_VARIABLE_NAME__"
  );
  t.equal(
    (mutableSurvey.value.pages[0].items[2] as PageItem).variableName,
    "__ITEM_ISRECORD__"
  );
  t.equal(
    (mutableSurvey.value.pages[0].items[7] as PageItem).variableName,
    "__ITEM_WORDING__"
  );
  t.end();
});

test("Interview Items for insert item command", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const interviewItems = getStudioItems(mutableParticipant, participant);
  t.equal(interviewItems[interviewItems.length - 2].value, "NEW_ITEM");
  t.equal(interviewItems[interviewItems.length - 1].value, undefined);
  t.deepLooseEqual(interviewItems[0].value, {
    en: "New Item",
    fr: "Nouvelle Question",
  });
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply item creation", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertItemCommand();
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdateItemCommand;
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0,
    0
  );
  const interviewItems = [
    new InterviewItem(command.variableNamePart, "Q0"),
    new InterviewItem(updateCommand.wordingPart, "item"),
    new InterviewItem(updateCommand.typePart, "text"),
    new InterviewItem(updateCommand.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.equal(mutableSurvey.items[0].variableName, "Q0");
  t.equal(
    mutableParticipant.interviews[0].items.last?.pageItem,
    mutableSurvey.items[0]
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply record item creation", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertItemCommand();
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdateItemCommand;
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0,
    0
  );
  const interviewItems = [
    new InterviewItem(command.variableNamePart, "Q0"),
    new InterviewItem(command.isRecordPart, 1),
    new InterviewItem(updateCommand.wordingPart, {
      en: "record",
      fr: "enregistrement",
    }),
    new InterviewItem(updateCommand.typePart, "text"),
    new InterviewItem(updateCommand.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.deepEqual(mutableSurvey.items[0].wording, {
    en: " -> record",
    fr: " -> enregistrement",
  });
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("command appliable with unique page item rule #97", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const items = getStudioItems(mutableParticipant, participant);
  const ruleViolation = items.update(i =>
    i == items.last ? i.update({ value: "Q2" }) : i
  );
  const global = Scope.create(
    DomainCollection(new Interview(survey.pageSets[0], {})),
    new Interview(survey.pageSets[0], {})
  );
  const scope = global.with([...ruleViolation]);
  const result = execute(
    command.parts?.crossRules as IDomainCollection<CrossItemRule>,
    scope
  ).items;
  t.deepLooseEqual(result[result.length - 2].messages, {
    unique: "variable name must be unique",
  });
  t.false(command.canApply(mutableSurvey, result));
  t.end();
});
