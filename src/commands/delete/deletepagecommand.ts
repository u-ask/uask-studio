import {
  CrossItemRule,
  getTranslation,
  IDomainCollection,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageItem,
  PageSet,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import { IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { libDeletePage } from "./libdetelepage.js";

export class DeletePageCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  parts?: Survey;
  private page?: Page;
  private pageSet?: PageSet;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  private buildParts(
    survey: Survey,
    section = {
      en: "Delete Page",
      fr: "Suppression de la page",
    } as mlstring
  ) {
    const builder = new SurveyBuilder();
    libDeletePage(builder, "deletePage", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number,
    pageIndex: number
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageIndex = pageIndex;
    this.pageSet = survey.value.pageSets[pageSetIndex];
    this.page = this.pageSet.pages[pageIndex];
    this.buildParts(survey, {
      en: `Delete page "${getTranslation(this.page.name, "en")}"`,
      fr: `Suppression de la page "${getTranslation(this.page.name, "fr")}"`,
    });
    const pageIndexInSurvey = survey.value.pages.findIndex(
      page => page == this.page
    );
    survey.insertItems(
      pageIndexInSurvey as number,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
  }

  apply(survey: MutableSurvey, participant: MutableParticipant): void {
    survey.deletePage(this.pageSetIndex as number, this.pageIndex as number);

    participant.updatePageSets(survey.pageSets);
    participant.deleteItems((this.page as Page).items);

    this.pageIndex = -1;
  }

  canApply(): boolean {
    return true;
  }
}
