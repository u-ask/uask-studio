import {
  Survey,
  Page,
  PageItem,
  mlstring,
  SurveyBuilder,
  MutableSurvey,
  PageBuilder,
  IDomainCollection,
  CrossItemRule,
  PageSet,
  getTranslation,
  MutableParticipant,
} from "uask-dom";
import { IMutationCommand } from "..";
import { libApply } from "../libapply.js";
import { libDeletePageSet } from "./libdeletepageset.js";

export class DeletePageSetCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private pageSet?: PageSet;
  private page?: Page;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  private buildParts(
    survey: Survey,
    section = {
      en: "Delete pageset",
      fr: "Suppression du pageset",
    } as mlstring
  ) {
    const builder = new SurveyBuilder();
    libDeletePageSet(builder, "delete", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageSet = survey.pageSets[this.pageSetIndex];
    this.buildParts(survey, {
      en: `Delete pageset "${getTranslation(this.pageSet.type, "en")}"`,
      fr: `Suppression du pageset "${getTranslation(this.pageSet.type, "fr")}"`,
    });

    const b = new SurveyBuilder();
    b.options(survey.options);
    const pagebuilder = b
      .page("Visit Parameters")
      .translate("fr", "Paramètres de la visite") as PageBuilder;
    this.page = pagebuilder.build([]);
    survey.insertPage(pageSetIndex, 0, this.page);
    this.pageIndex = survey.pageSets[this.pageSetIndex].pages.indexOf(this.page);
    this.surveyPageIndex = survey.pages.indexOf(this.page);
    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
  }

  apply(survey: MutableSurvey, participant: MutableParticipant): void {
    survey.deletePageSet(this.pageSetIndex as number);

    participant.deletePageSet(this.pageSet as PageSet);

    this.pageSetIndex = -1;
    this.pageIndex = -1;
  }

  canApply(): boolean {
    return true;
  }
}
