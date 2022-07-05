import {
  MutableSurvey,
  PageSet,
  IDomainCollection,
  InterviewItem,
  Survey,
  SurveyBuilder,
  PageBuilder,
  Page,
  PageItem,
  DomainCollection,
  mlstring,
  PageDef,
  PageSetBuilder,
  CrossItemRule,
  getTranslation,
  MutableParticipant,
} from "uask-dom";
import { IMutationCommand, allRequiredSet } from "../command.js";
import { libApply } from "../libapply.js";
import { libUpdatePageSet } from "./libupdatepageset.js";

export class UpdatePageSetCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private pageSet?: PageSet;
  private page?: Page;
  private defaultLang?: string;

  private buildParts(
    survey: Survey,
    section = {
      en: "Update Visit",
      fr: "Mise à jour de la visite",
    } as mlstring
  ) {
    const builder = new SurveyBuilder();
    libUpdatePageSet(builder, "updatePageSet", survey, section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  get itemParts(): IDomainCollection<PageItem> | undefined {
    return this.parts?.items;
  }

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  get typePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_SET_NAME__"
    ) as PageItem;
  }

  get dateVarPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_SET_DATEVAR__"
    ) as PageItem;
  }

  get pagesPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_SET_PAGES__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number,
    section?: mlstring
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageIndex = 0;
    this.pageSet = survey.value.pageSets[this.pageSetIndex];
    this.defaultLang = survey.options.defaultLang;

    this.buildParts(survey, section);
    this.page = this.buildParameterPage(survey);

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

  private buildParameterPage(survey: MutableSurvey) {
    const b = new SurveyBuilder();
    b.options(survey.options);
    const pagebuilder = b
      .page("Visit Parameters")
      .translate("fr", "Paramètres de la visite") as PageBuilder;
    return pagebuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const typeName = this.pageSet?.type;
    const dateVar = this.pageSet?.datevar;
    const pages = this.pageSet?.pages.map(p => {
      return {
        name: getTranslation(p.name, "__code__", this.defaultLang) as string,
        mandatory: this.pageSet?.mandatoryPages?.includes(p),
      } as PageDef;
    });
    return DomainCollection(
      new InterviewItem(this.typePart, typeName),
      new InterviewItem(this.dateVarPart, dateVar),
      new InterviewItem(this.pagesPart, pages)
    );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { updatedPageSet } = this.bindPartItems(survey, interviewItems);
    survey.updatePageSet(this.pageSetIndex as number, updatedPageSet);

    participant.updatePageSet(updatedPageSet);

    this.pageIndex = -1;
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { updatedPageSet: PageSet } {
    const pageSetBuilder = this.getBuilder(survey);

    this.bindTypeNames(interviewItems, pageSetBuilder, survey);

    const dateVariable = interviewItems.find(
      i => i.pageItem == this.dateVarPart
    )?.value as string;
    if (dateVariable)
      pageSetBuilder.datevariable(dateVariable) as PageSetBuilder;

    const pages = interviewItems.find(i => i.pageItem == this.pagesPart)
      ?.value as IDomainCollection<PageDef> | undefined;
    if (pages) pageSetBuilder.pages(...pages);

    const updatedPageSet = pageSetBuilder.build([...survey.pages]);
    return { updatedPageSet };
  }

  private getBuilder(survey: Survey) {
    const code = getTranslation(
      this.pageSet?.type,
      "__code__",
      survey.options.defaultLang
    ) as string;

    const surveyBuilder = new SurveyBuilder();
    surveyBuilder.options(survey.options);
    const pageSetBuilder = surveyBuilder.pageSet(code) as PageSetBuilder;
    return pageSetBuilder;
  }

  private bindTypeNames(
    interviewItems: InterviewItem[],
    pageSetBuilder: PageSetBuilder,
    survey: Survey
  ) {
    const types = interviewItems.find(i => i.pageItem == this.typePart)
      ?.value as mlstring;
    if (types && typeof types != "string") {
      const langs = Object.entries(types);
      langs.forEach(([lang, type]) => pageSetBuilder.translate(lang, type));
    } else {
      const defaultLang = survey.options.defaultLang as string;
      pageSetBuilder.translate(defaultLang, types);
    }
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [...(this.parts?.items as IDomainCollection<PageItem>)];
    return allRequiredSet(allParts, interviewItems);
  }
}
