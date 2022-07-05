import {
  CrossItemRule,
  CrossRule,
  DomainCollection,
  execute,
  HasValue,
  IDomainCollection,
  InterviewItem,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Scope,
  setMessageIf,
  Survey,
  SurveyBuilder,
  update,
  Workflow,
  WorkflowBuilder,
} from "uask-dom";
import { allRequiredSet, allUniqueSet, IMutationCommand } from "../command.js";
import { UpdateWorkflowCommand } from "../update/updateworkflowcommand.js";
import { libInsertDerivedWorkflow } from "./libinsertderivedworkflow.js";

export class UniqueWorkflowRule implements CrossRule {
  constructor(readonly survey: Survey, readonly workflow: Workflow) {}

  execute(names: HasValue, spec: HasValue): [HasValue, HasValue] {
    const messages = setMessageIf(
      this.workflowAlreadyExist(names.value as string[], spec.value as string)
    )(spec.messages, "unique", "workflow name:specifier must be unique");
    return [names, update(spec, { messages: { ...messages } })];
  }

  workflowAlreadyExist(names: string[], spec: string): boolean {
    const namesWithWpec = names?.map(
      name => `${name}${spec ? `:${spec}` : ""}`
    );
    return this.survey.workflows.some(w => namesWithWpec?.includes(w.name));
  }

  name = "unique";
  precedence = 100;
}

export class InsertWorkflowCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  readonly updateCommand: UpdateWorkflowCommand;
  private workflow?: Workflow;
  private workflowIndex?: number;
  parts?: Survey;

  private buildParts(survey: Survey, section: mlstring) {
    const builder = new SurveyBuilder();
    libInsertDerivedWorkflow(builder, "updateWorkflow", survey, section);
    this.parts = builder.get();
    this.parts = this.parts?.update({
      crossRules: this.parts.crossRules.append(
        new CrossItemRule(
          DomainCollection(this.namePart, this.specifierPart),
          new UniqueWorkflowRule(survey, this.workflow as Workflow)
        )
      ),
    });
  }

  get namePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_NAME__"
    ) as PageItem;
  }

  get specifierPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_SPECIFIER__"
    ) as PageItem;
  }

  constructor() {
    this.updateCommand = new UpdateWorkflowCommand();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number
  ): void {
    this.pageSetIndex = pageSetIndex;

    this.workflow = this.buildNewWorkflow();
    survey.insertWorkflow(this.workflow);
    this.workflowIndex = survey.workflows.findIndex(w => w == this.workflow);

    const section = { en: "Insert Workflow", fr: "Insérer un workflow" };
    this.updateCommand.start(
      survey,
      participant,
      this.workflowIndex,
      pageSetIndex,
      section
    );
    this.pageIndex = this.updateCommand.pageIndex;
    this.surveyPageIndex = this.updateCommand.surveyPageIndex;
    this.buildParts(survey, section);

    survey.insertItems(
      this.surveyPageIndex as number,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    return DomainCollection(
      ...this.getPartMessages(
        new InterviewItem(this.namePart, undefined),
        new InterviewItem(this.specifierPart, undefined)
      )
    );
  }

  private getPartMessages(...items: InterviewItem[]) {
    const scope = Scope.create([]).with(items);
    return execute((this.parts as Survey).rules, scope).items;
  }

  private buildNewWorkflow() {
    const workflowBuilder = new SurveyBuilder().workflow() as WorkflowBuilder;
    const workflow = workflowBuilder.build([]);
    return workflow.update({ name: "" });
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { insertedWorkflows } = this.bindPartItems(
      survey.value,
      interviewItems
    );
    for (const workflow of insertedWorkflows) survey.insertWorkflow(workflow);
  }

  private bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { insertedWorkflows: Workflow[] } {
    const { updatedWorkflow } = this.updateCommand.bindPartItems(
      survey,
      interviewItems
    );
    const names = interviewItems.find(i => i.pageItem == this.namePart)
      ?.value as string[];
    const specifier = interviewItems.find(i => i.pageItem == this.specifierPart)
      ?.value as string;
    const insertedWorkflows = names.map(name => {
      const nameWithSpec = specifier ? `${name}:${specifier}` : name;
      return updatedWorkflow.update({ name: nameWithSpec });
    });
    return { insertedWorkflows };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [
      ...(this.parts?.items as IDomainCollection<PageItem>),
      ...(this.updateCommand.parts?.items as IDomainCollection<PageItem>),
    ];
    return (
      allRequiredSet(allParts, interviewItems) &&
      allUniqueSet(allParts, interviewItems)
    );
  }
}
