import {
  CrossItemRule,
  DomainCollection,
  execute,
  getTranslation,
  IDomainCollection,
  Interview,
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageItem,
  PageSetBuilder,
  ParticipantBuilder,
  Scope,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { isConsistent } from "../test-utils.js";
import { UpdatePageSetCommand } from "../update/updatepagesetcommand.js";
import {
  InsertPageSetCommand,
  UniquePageSetRule,
} from "./insertpagesetcommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow();
  b.pageSet("PS1").pages("P1");
  b.pageSet("PS2").pages("P2");
  b.page("P1").question("Q1", "Q1", b.types.real);
  b.page("P2").question("Q2", "Q2", b.types.real);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q1").value(1);
  pb.interview("PS2").item("Q2").value(2);
  const participant = pb.build();
  return { survey, participant };
}

test("Insert page set start command #249", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertPageSetCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant);
  const items = mutableSurvey.value.pageSets[3].pages[0]
    .items as IDomainCollection<PageItem>;
  const partsVariableNames = [
    "__PAGE_SET_CODE__",
    "__PAGE_SET_NAME__",
    "__PAGE_SET_DATEVAR__",
    "__PAGE_SET_PAGES__",
  ];
  t.true(partsVariableNames.every(v => items.find(i => v == i.variableName)));
  t.equal(mutableParticipant.interviews[2].pageSet, mutableSurvey.pageSets[3]);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Interview items for insert page set #249", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertPageSetCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant);
  const updateCommand = Reflect.get(command, "updateCommand");
  const interviewItems = mutableParticipant.interviews[2].items;
  const code = interviewItems.find(i => i.pageItem == command.codePart)?.value;
  const name = interviewItems.find(
    i => i.pageItem == updateCommand.typePart
  )?.value;
  const datevar = interviewItems.find(
    i => i.pageItem == updateCommand.dateVarPart
  )?.value;
  const pages = interviewItems.find(
    i => i.pageItem == updateCommand.pagesPart
  )?.value;
  t.equal(code, "NEWPAGESET");
  t.deepEqual(name, {
    __code__: "NEWPAGESET",
    en: "New Visit",
    fr: "Nouvelle Visite",
  });
  t.equal(datevar, undefined);
  t.equal((pages as Page[]).length, 0);
  t.end();
});

test("Insert page set apply #249", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertPageSetCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant));
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdatePageSetCommand;
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, [
    new InterviewItem(command.codePart, "TEST"),
    new InterviewItem(updateCommand.typePart, {
      en: "New name",
      fr: "Nouveau nom",
    }),
    new InterviewItem(updateCommand.dateVarPart, "DATEVAR"),
    new InterviewItem(updateCommand.pagesPart, ["P1", "P2"]),
    new InterviewItem(updateCommand.applyPart, true),
  ]);
  t.equal(mutableSurvey.pageSets.length, 4);
  t.deepEqual(mutableSurvey.pageSets[3].type, {
    __code__: "TEST",
    en: "New name",
    fr: "Nouveau nom",
  });
  t.deepLooseEqual(
    mutableSurvey.pageSets[3].pages.map(p =>
      getTranslation(p.name, "__code__")
    ),
    ["P1", "P2"]
  );
  t.equal(mutableSurvey.pageSets[3].datevar, "DATEVAR");
  t.equal(mutableParticipant.interviews[2].pageSet, mutableSurvey.pageSets[3]);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Update command appliable with unique page set rule #249", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertPageSetCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant);
  const global = Scope.create(
    DomainCollection(new Interview(survey.pageSets[0], {})),
    new Interview(survey.pageSets[0], {})
  );
  const items = mutableParticipant.interviews[2].items;
  const ruleViolation = items.update(i =>
    i.pageItem == command.codePart ? i.update({ value: "PS2" }) : i
  );
  const scope = global.with([...ruleViolation]);
  const result = execute(
    command.parts?.crossRules as IDomainCollection<CrossItemRule>,
    scope
  ).items;
  t.deepLooseEqual(
    result.find(i => i.pageItem.variableName == "__PAGE_SET_CODE__")?.messages,
    { unique: "page set code must be unique" }
  );
  t.false(command.canApply(mutableSurvey, result));
  t.end();
});

test("Create unique page set rule #249", t => {
  const { survey } = buildTestSurvey();
  const pageSet = new PageSetBuilder("PS2", {}).build([]);
  const uniqueRule = new UniquePageSetRule(survey, pageSet);
  const exec = uniqueRule.execute({ value: "PS2" });
  t.deepLooseEqual(exec.messages, { unique: "page set code must be unique" });
  t.end();
});
