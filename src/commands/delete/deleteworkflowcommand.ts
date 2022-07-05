import {
  CrossItemRule,
  IDomainCollection,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageBuilder,
  PageItem,
  Survey,
  SurveyBuilder,
  Workflow,
} from "uask-dom";
import { IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { libDeleteWorkflow } from "./libdeteleworkflow.js";

export class DeleteWorkflowCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private workflowIndex?: number;
  private workflow?: Workflow;
  private page?: Page;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  private buildParts(
    survey: Survey,
    section = {
      en: "Delete Workflow",
      fr: "Suppression du workflow",
    } as mlstring
  ) {
    const builder = new SurveyBuilder();
    libDeleteWorkflow(builder, "delete", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    workflowIndex: number,
    pageSetIndex: number
  ): void {
    this.workflowIndex = workflowIndex;
    this.workflow = survey.value.workflows[this.workflowIndex];
    this.pageSetIndex = pageSetIndex;

    this.buildParts(survey, {
      en: `Delete workflow "${this.workflow.name}"`,
      fr: `Suppression du workflow "${this.workflow.name}"`,
    });

    const b = new SurveyBuilder();
    b.options(survey.options);
    const pageBuilder = b
      .page("Workflow parameters")
      .translate("fr", "Paramètres du workflow") as PageBuilder;
    this.page = pageBuilder.build([]);
    survey.insertPage(pageSetIndex, 0, this.page);
    this.pageIndex = 0;
    this.surveyPageIndex = survey.pages.indexOf(this.page);
    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
  }

  apply(survey: MutableSurvey): void {
    survey.deleteWorkflow(this.workflowIndex as number);
  }

  canApply(): boolean {
    return true;
  }
}
