import {
  CrossItemRule,
  getScopedItem,
  IDomainCollection,
  InterviewItem,
  Library,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageItem,
  Participant,
  ParticipantBuilder,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { isConsistent } from "../test-utils.js";
import { IncludePageCommand } from "./includepagecommand.js";
import { UpdatePageCommand } from "./updatepagecommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1", "P2", "P3");
  b.page("P1")
    .translate("en", "Page 1")
    .translate("es", "Pagina 1")
    .question("Q1", "Q1", b.types.real)
    .question("Q2", "Q2", b.types.real);
  b.page("P2")
    .question("Q3", "Q3", b.types.date(false))
    .question("Q4", "Q4", b.types.text, b.types.yesno);
  b.page("P3").question("Info", "INFO", b.types.info).include("P1");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1")
    .item("Q1")
    .value(1)
    .item("Q2")
    .value(2)
    .item("Q3")
    .value(3);
  const participant = pb.build();
  return { survey, participant };
}

test("start update page command", t => {
  const { mutableSurvey, mutableParticipant } = startCommand();
  const items = mutableSurvey.value.pages[0]
    .items as IDomainCollection<PageItem>;
  const partsVariableNames = [
    "__PAGE_NAME__",
    "__INCLUDE__",
    "__INCLUDE_PAGE__",
    "__INCLUDE_SELECT_P1__",
    "__INCLUDE_SELECT_P2__",
    "__INCLUDE_SELECT_P3__",
    "__INCLUDE_CONTEXT__",
    "__APPLY__",
  ];
  t.true(
    partsVariableNames.every(
      (v, x) => items.findIndex(i => v == i.variableName) == x
    )
  );
  const includePageRule = mutableSurvey.crossRules.find(
    r =>
      r.target.variableName == "__INCLUDE_PAGE__" &&
      r.args.underlyingRule == "activation"
  ) as CrossItemRule;
  t.true(
    includePageRule.pageItems.some(
      p => getScopedItem(p).variableName == "__INCLUDE__"
    )
  );
  t.deepEqual(includePageRule.args.formula, ["[[$1]]", 1]);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Participant items on update page command", t => {
  const { context, mutableParticipant } = startCommand();
  const name = mutableParticipant.interviews[0].items.find(
    i => i.pageItem == context.command.namePart
  )?.value;
  t.deepEquals(name, { __code__: "P1", en: "Page 1", es: "Pagina 1" });
  t.end();
});

test("apply update page command on page with code", t => {
  const { context } = startCommand();
  const pageItems = context.survey.pages[0].items;
  const items = [
    new InterviewItem(context.command.namePart, {
      en: "Page 0",
      es: "Pagina 0",
    }),
  ];
  const { mutableSurvey, mutableParticipant } = applyCommand(context, items);
  const page = mutableSurvey.pages[0] as Page;
  const pageName = page.name as Record<string, string>;
  t.equal(pageName.__code__, "P1");
  t.equal(pageName.en, "Page 0");
  t.equal(pageName.es, "Pagina 0");
  t.deepEquals(page.items, pageItems);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("apply update page command on page with name only", t => {
  const { context } = startCommand(1);
  const items = [new InterviewItem(context.command.namePart, { en: "Page 2" })];
  const { mutableSurvey, mutableParticipant } = applyCommand(context, items);
  const page = mutableSurvey.pages[1];
  const pageName = page.name as Record<string, string>;
  t.equal(pageName.__code__, "P2");
  t.equal(pageName.en, "Page 2");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("apply update page command on page with include #386", t => {
  const { context } = startCommand(2);
  const includeCommand = Reflect.get(
    context.command,
    "includeCommand"
  ) as IncludePageCommand;
  const items = [
    new InterviewItem(context.command.namePart, { en: "Page 2" }),
    new InterviewItem(includeCommand.includePart, 1),
    new InterviewItem(includeCommand.pageCodePart, "P2"),
    new InterviewItem(includeCommand.selectorParts["P2"], ["Q4"]),
    new InterviewItem(includeCommand.contextPart, 1),
  ];
  const { mutableSurvey, mutableParticipant } = applyCommand(context, items);
  const include = mutableSurvey.pages[2].includes[1] as Library;
  t.equal(include.page, mutableSurvey.pages[1]);
  t.deepLooseEqual(include.pageItems, [mutableSurvey.items[3]]);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Get all parts update page command", t => {
  const { context } = startCommand();
  const itemParts = context.command.itemParts;
  t.true(itemParts?.find(part => part == context.command.namePart));
  t.end();
});

function startCommand(pageIndex = 0) {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdatePageCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, pageIndex);
  return { context: { command, survey, participant }, mutableSurvey, mutableParticipant };
}

function applyCommand(
  context: {
    command: UpdatePageCommand;
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
