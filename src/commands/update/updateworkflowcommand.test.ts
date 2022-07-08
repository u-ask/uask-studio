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
  ParticipantBuilder,
  Scope,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { isConsistent } from "../test-utils.js";
import { UpdateWorkflowCommand } from "./updateworkflowcommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow()
    .home("SYNT")
    .initial("INIT")
    .followUp("FUP")
    .auxiliary("BIOCH")
    .terminal("END");
  b.workflow("surveycoordinator:pv").notify("incl", "ae");
  b.workflow("participant").withPageSets("INIT", "FUP");
  b.pageSet("SYNT")
    .pageSet("INIT")
    .pageSet("FUP")
    .pageSet("BIOCH")
    .pageSet("END");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("SYNT");
  const participant = pb.build();
  return { survey, participant };
}

test("Start workflow update command on main workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  t.deepLooseEqual(mutableSurvey.pageSets[0].pages[0].name, {
    en: "Workflow parameters",
    fr: "Paramètres du workflow",
  });
  t.equal(command.initialPart?.variableName, "__WORKFLOW_INITIAL__");
  t.equal(command.followupPart?.variableName, "__WORKFLOW_FOLLOWUP__");
  t.equal(command.auxiliaryPart?.variableName, "__WORKFLOW_AUXILIARY__");
  t.equal(command.endPart?.variableName, "__WORKFLOW_END__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Start workflow update command on derived workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 2, 0);
  t.deepLooseEqual(mutableSurvey.pageSets[0].pages[0].name, {
    en: "Workflow parameters",
    fr: "Paramètres du workflow",
  });
  t.equal(command.withpagesetsPart.variableName, "__WORKFLOW_WITH_PAGESETS__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Interview items for main workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const interviewItems = Reflect.get(command, "getPartItems").call(command);
  t.deepLooseEqual(interviewItems[0].value, ["INIT"]);
  t.deepLooseEqual(interviewItems[1].value, ["FUP"]);
  t.deepLooseEqual(interviewItems[2].value, ["BIOCH"]);
  t.deepLooseEqual(interviewItems[3].value, ["END"]);
  t.end();
});

test("Interview items for derived workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 2, 0);
  const interviewItems = Reflect.get(command, "getPartItems").call(command);
  t.deepLooseEqual(interviewItems[0].value, ["SYNT", "INIT", "FUP"]);
  t.end();
});

test("Apply modifications on main workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdateWorkflowCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0,
    0
  );
  const interviewItems = [
    new InterviewItem(command.initialPart, ["BIOCH"]),
    new InterviewItem(command.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.equal(
    getTranslation(mutableSurvey.workflows[0].info?.type, "__code__"),
    "SYNT"
  );
  t.equal(
    getTranslation(mutableSurvey.workflows[0].start.type, "__code__"),
    "BIOCH"
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply modifications on participant workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdateWorkflowCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    2,
    0
  );
  const interviewItems = [
    new InterviewItem(command.withpagesetsPart, ["INIT"]),
    new InterviewItem(command.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.equal(mutableSurvey.workflows[2].info, mutableSurvey.mainWorkflow.info);
  t.equal(
    getTranslation(mutableSurvey.workflows[2].start?.type, "__code__"),
    "INIT"
  );
  t.equal(mutableSurvey.workflows[2].many.length, 0);
  t.equal(mutableSurvey.workflows[2].single.length, 1);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Command is appliable on main workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 0, 0);
  const interviewItems = [new InterviewItem(command.applyPart, true)];
  const global = Scope.create(
    DomainCollection(new Interview(survey.pageSets[0], {})),
    new Interview(survey.pageSets[0], {})
  );
  const scope = global.with([...interviewItems]);
  const result = execute(
    command.parts?.crossRules as IDomainCollection<CrossItemRule>,
    scope
  ).items;
  t.true(command.canApply(mutableSurvey, result));
  t.end();
});

test("Notification items #275", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 1, 0);
  const interviewItems = Reflect.get(command, "getPartItems").call(command);
  t.deepLooseEqual(interviewItems[0].value, [
    "SYNT",
    "INIT",
    "FUP",
    "END",
    "BIOCH",
  ]);
  t.deepLooseEqual(interviewItems[1].value, ["incl", "ae"]);
  t.end();
});

test("Notification changes #275", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdateWorkflowCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    1,
    0
  );
  const interviewItems = Reflect.get(command, "getPartItems").call(
    command
  ) as IDomainCollection<InterviewItem>;
  const updated = interviewItems.update(i => {
    if (i.pageItem == command.notificationsPart)
      return i.update({ value: ["ae", "wd"] });
    return i;
  });
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, [...updated]);
  t.deepLooseEqual(mutableSurvey.value.workflows[1].notifications, [
    "ae",
    "wd",
  ]);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
