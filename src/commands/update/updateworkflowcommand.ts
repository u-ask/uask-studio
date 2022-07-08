import {
  CrossItemRule,
  DomainCollection,
  getTranslation,
  IDomainCollection,
  InterviewItem,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageBuilder,
  PageItem,
  Survey,
  SurveyBuilder,
  Workflow,
  WorkflowBuilder,
} from "uask-dom";
import { workflowDeserialize, workflowSerialize } from "uask-sys";
import { allRequiredSet, IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { libUpdateMainWorkflow } from "./libupdatemainworkflow.js";
import { libUpdateDerivedWorkflow } from "./libupdatederivedworkflow.js";

export class UpdateWorkflowCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private workflowIndex?: number;
  private workflow?: Workflow;
  private mainWorkflow?: Workflow; //only used for rule
  private page?: Page;
  private defaultLang?: string;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  get initialPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_INITIAL__"
    ) as PageItem;
  }

  get followupPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_FOLLOWUP__"
    ) as PageItem;
  }

  get auxiliaryPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_AUXILIARY__"
    ) as PageItem;
  }

  get endPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_END__"
    ) as PageItem;
  }

  get withpagesetsPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_WITH_PAGESETS__"
    ) as PageItem;
  }

  get notificationsPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__WORKFLOW_NOTIFICATIONS__"
    ) as PageItem;
  }

  get isMain(): boolean {
    return this.mainWorkflow === this.workflow;
  }

  private buildParts(survey: Survey, section: mlstring) {
    const builder = new SurveyBuilder();
    this.isMain
      ? libUpdateMainWorkflow(builder, "updateWorkflow", survey, section)
      : libUpdateDerivedWorkflow(builder, "updateWorkflow", survey, section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    workflowIndex: number,
    pageSetIndex: number,
    section?: mlstring
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageIndex = 0;
    this.workflowIndex = workflowIndex;
    this.workflow = survey.value.workflows[this.workflowIndex];
    this.mainWorkflow = survey.mainWorkflow;
    this.defaultLang = survey.options.defaultLang;
    this.buildParts(
      survey,
      section ?? {
        en: `Update Workflow ${this.workflow.name}`,
        fr: `Mise à jour du workflow ${this.workflow.name}`,
      }
    );
    this.page = this.buildSettingsPage(survey);

    survey.insertPage(pageSetIndex, 0, this.page);
    this.surveyPageIndex = survey.pages.indexOf(this.page);

    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private buildSettingsPage(survey: MutableSurvey) {
    const b = new SurveyBuilder();
    b.options(survey.options);
    const pageBuilder = b
      .page("Workflow parameters")
      .translate("fr", "Paramètres du workflow") as PageBuilder;
    return pageBuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const initial = this.workflow?.single
      .filter(ps => this.workflow?.sequence.includes(ps))
      .map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
    const followup = this.workflow?.many
      .filter(ps => this.workflow?.sequence.includes(ps))
      .map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
    const auxiliary = this.workflow?.many
      .filter(ps => !this.workflow?.sequence.includes(ps))
      .map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
    const withPageSets = this.workflow?.pageSets.map(ps =>
      getTranslation(ps.type, "__code__", this.defaultLang)
    );
    const notifications = this.workflow ? [...this.workflow.notifications] : [];
    const end = this.workflow?.stop.map(ps =>
      getTranslation(ps.type, "__code__", this.defaultLang)
    );
    return this.isMain
      ? DomainCollection(
          new InterviewItem(this.initialPart, initial),
          new InterviewItem(this.followupPart, followup),
          new InterviewItem(this.auxiliaryPart, auxiliary),
          new InterviewItem(this.endPart, end)
        )
      : DomainCollection(
          new InterviewItem(this.withpagesetsPart, withPageSets),
          new InterviewItem(this.notificationsPart, notifications)
        );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { updatedWorkflow } = this.bindPartItems(survey, interviewItems);
    survey.updateWorkflow(this.workflowIndex as number, updatedWorkflow);
    if (updatedWorkflow == survey.mainWorkflow && survey.workflows.length > 1) {
      survey.workflows.map((w, index) => {
        if (index != this.workflowIndex)
          survey.updateWorkflow(index, this.rebuildDerivedWorkflow(survey, w));
      });
    }
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { updatedWorkflow: Workflow } {
    const home = getTranslation(
      this.workflow?.info?.type,
      "__code__",
      this.defaultLang
    );
    const [name, specifier] = this.workflow?.name.split(":") ?? [];
    const initial = interviewItems.find(i => i.pageItem == this.initialPart)
      ?.value as string[];
    const followUp = interviewItems.find(i => i.pageItem == this.followupPart)
      ?.value as string[];
    const auxiliary = interviewItems.find(i => i.pageItem == this.auxiliaryPart)
      ?.value as string[];
    const end = interviewItems.find(i => i.pageItem == this.endPart)
      ?.value as string[];
    const withPageSets = interviewItems.find(
      i => i.pageItem == this.withpagesetsPart
    )?.value as string[];
    const notifications = interviewItems.find(
      i => i.pageItem == this.notificationsPart
    )?.value as string[];
    const b = new SurveyBuilder();
    let workflowBuilder;
    if (name == "main") {
      workflowBuilder = b.workflow();
      if (home) workflowBuilder.home(home as string);
      if (initial) workflowBuilder.initial(...initial);
      if (followUp) workflowBuilder.followUp(...followUp);
      if (auxiliary) workflowBuilder.auxiliary(...auxiliary);
      if (end) workflowBuilder.terminal(...end);
    } else {
      const nameWithSpec = specifier ? `${name}:${specifier}` : name;
      const mainWorkflow = workflowSerialize(
        survey.mainWorkflow,
        survey.options
      );
      workflowDeserialize(b, mainWorkflow);
      workflowBuilder = b.workflow(nameWithSpec);
      if (withPageSets) workflowBuilder.withPageSets(...withPageSets);
      if (notifications) workflowBuilder.notify(...notifications);
    }
    const updatedWorkflow = (workflowBuilder as WorkflowBuilder).build([
      ...survey.pageSets,
    ]);
    return { updatedWorkflow };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [...(this.parts?.items as IDomainCollection<PageItem>)];
    return allRequiredSet(allParts, interviewItems);
  }

  private rebuildDerivedWorkflow(
    survey: MutableSurvey,
    workflow: Workflow
  ): Workflow {
    const withPageSets = [
      ...workflow.pageSets.map(ps =>
        getTranslation(ps.type, "__code__", this.defaultLang)
      ),
    ] as string[];

    const b = new SurveyBuilder();
    const mainWorkflow = workflowSerialize(survey.mainWorkflow, survey.options);
    workflowDeserialize(b, mainWorkflow);
    const workflowBuilder = b
      .workflow(workflow.name)
      .withPageSets(...withPageSets) as WorkflowBuilder;
    return workflowBuilder.build([...survey.pageSets]);
  }
}
