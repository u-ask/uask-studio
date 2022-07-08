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
  PageItem,
  ParticipantBuilder,
  Scope,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { UpdateWorkflowCommand } from "../update/updateworkflowcommand.js";
import { InsertWorkflowCommand } from "./insertworkflowcommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow()
    .home("SYNTH")
    .initial("INIT")
    .followUp("FUP")
    .auxiliary("BIOCH")
    .terminal("END");
  b.workflow("participant:special").withPageSets("INIT", "FUP");
  b.pageSet("SYNTH")
    .pageSet("INIT")
    .pageSet("FUP")
    .pageSet("BIOCH")
    .pageSet("END");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("SYNTH");
  const participant = pb.build();
  return { survey, participant };
}

test("Start insert workflow command #300", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new InsertWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  const items = mutableSurvey.pageSets[0].pages[0]
    .items as IDomainCollection<PageItem>;
  const partVariableNames = ["__WORKFLOW_NAME__", "__WORKFLOW_WITH_PAGESETS__"];
  t.true(partVariableNames.every(v => items.find(i => v == i.variableName)));
  t.end();
});

test("Interview items for workflow insert #300", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new InsertWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  const items = mutableParticipant.interviews[0].items;
  t.equal(items.length, 4);
  t.end();
});

test("Apply insert workflow command #300", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertWorkflowCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0
  );
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdateWorkflowCommand;
  const interviewItems = [
    new InterviewItem(command.namePart, ["administrator", "surveycoordinator"]),
    new InterviewItem(updateCommand.withpagesetsPart, ["INIT"]),
    new InterviewItem(updateCommand.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.equal(mutableSurvey.workflows[2].name, "administrator");
  t.equal(
    getTranslation(mutableSurvey.workflows[2].start?.type, "__code__"),
    "INIT"
  );
  t.equal(mutableSurvey.workflows[2].many.length, 0);
  t.equal(mutableSurvey.workflows[2].single.length, 1);
  t.deepEqual(
    { ...mutableSurvey.workflows[3] },
    { ...mutableSurvey.workflows[2], name: "surveycoordinator" }
  );
  t.end();
});

test("Command is appliable on derived workflow #248", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new InsertWorkflowCommand();
  command.start(mutableSurvey, mutableParticipant, 2);
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdateWorkflowCommand;
  const interviewItems = [
    new InterviewItem(command.namePart, ["participant", "administrator"]),
    new InterviewItem(command.specifierPart, "special"),
    new InterviewItem(updateCommand.withpagesetsPart, ["INIT"]),
    new InterviewItem(updateCommand.applyPart, true),
  ];
  const global = Scope.create(
    DomainCollection(new Interview(survey.pageSets[0], {})),
    new Interview(survey.pageSets[0], {})
  );
  const scope = global.with([...interviewItems]);
  const result = execute(
    mutableSurvey.crossRules as IDomainCollection<CrossItemRule>,
    scope
  ).items;
  t.false(command.canApply(mutableSurvey, result));
  t.end();
});
