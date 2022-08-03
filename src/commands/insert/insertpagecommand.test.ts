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
  Participant,
  ParticipantBuilder,
  Scope,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { InsertPageCommand } from "./insertpagecommand.js";
import { UpdatePageCommand } from "../update/updatepagecommand.js";
import { isConsistent } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1", "P3");
  b.pageSet("PS2").pages("P2");
  b.page("P1")
    .question("Q1", "Q1", b.types.real)
    .question("Q2", "Q2", b.types.real);
  b.page("P2")
    .translate("en", "Page deux")
    .translate("fr", "Page two")
    .question("Q3", "Q3", b.types.date(false))
    .question("Q4", "Q4", b.types.text);
  b.page("P3");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q1").value(1).item("Q2").value(2);
  pb.interview("PS2").item("Q3").value(3).item("Q4").value(4);
  const participant = pb.build();
  return { survey, participant };
}

test("start insert page command #97", t => {
  const { mutableSurvey, mutableParticipant } = startCommand();
  const items = mutableSurvey.value.pages[4]
    .items as IDomainCollection<PageItem>;
  const partsVariableNamesUpdate = [
    "__PAGE_CODE__",
    "__PAGE_NAME__",
    "__APPLY__",
  ];
  t.true(
    partsVariableNamesUpdate.every(v => items.find(i => v == i.variableName))
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("apply insert item command #97", t => {
  const { context } = startCommand();
  const updateCommand = Reflect.get(
    context.command,
    "updateCommand"
  ) as UpdatePageCommand;
  const items = [
    new InterviewItem(context.command.codePart, "CODE"),
    new InterviewItem(updateCommand.namePart, "New Page"),
  ];
  const { mutableSurvey, mutableParticipant } = applyCommand(context, items);
  t.deepEquals(mutableSurvey.value.pageSets[0].pages[1].name, {
    __code__: "CODE",
    en: "New Page",
  });
  t.true(
    mutableSurvey.value.pages.some(
      p => (p.name as Record<string, string>).en == "New Page"
    )
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Interview items for insert page command #97", t => {
  const { context, mutableParticipant } = startCommand();
  const interviewItems = mutableParticipant.interviews[0].items;
  const updateCommand = Reflect.get(
    context.command,
    "updateCommand"
  ) as UpdatePageCommand;
  const code = interviewItems.find(
    i => i.pageItem == context.command.codePart
  )?.value;
  const name = interviewItems.find(
    i => i.pageItem == updateCommand.namePart
  )?.value;
  t.equal(code, "PAGE");
  t.deepEquals(name, { __code__: "PAGE", en: "New Page", fr: "Nouvelle Page" });
  t.end();
});

test("Update page not allowed if non unique page name #97", t => {
  const { context, mutableSurvey, mutableParticipant } = startCommand(3);
  const global = Scope.create(
    DomainCollection(new Interview(mutableSurvey.pageSets[0], {})),
    new Interview(mutableSurvey.pageSets[0], {})
  );
  const items = mutableParticipant.interviews[0].items;
  const ruleViolation = items.update(i =>
    i.pageItem == context.command.codePart ? i.update({ value: "P2" }) : i
  );
  const scope = global.with([...ruleViolation]);
  const result = execute(
    context.command.parts?.crossRules as IDomainCollection<CrossItemRule>,
    scope
  ).items;
  t.deepLooseEqual(
    result.find(i => i.pageItem.variableName == "__PAGE_CODE__")?.messages,
    { unique: "page name must be unique" }
  );
  t.false(context.command.canApply(context.survey, result));
  t.end();
});

function startCommand(pageIndex = 1) {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertPageCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, pageIndex);
  return {
    context: { command, survey, participant },
    mutableSurvey,
    mutableParticipant,
  };
}

function applyCommand(
  context: {
    command: InsertPageCommand;
    survey: Survey;
    participant: Participant;
  },
  items: InterviewItem[]
) {
  const mutableSurvey = new MutableSurvey(context.survey);
  const mutableParticipant = new MutableParticipant(context.participant);
  context.command.apply(mutableSurvey, mutableParticipant, items);
  return { mutableSurvey, mutableParticipant };
}
