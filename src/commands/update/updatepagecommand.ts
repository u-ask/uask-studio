import {
  MutableSurvey,
  IDomainCollection,
  InterviewItem,
  Survey,
  SurveyBuilder,
  PageItem,
  Page,
  DomainCollection,
  PageBuilder,
  mlstring,
  getTranslation,
  CrossItemRule,
  MutableParticipant,
} from "uask-dom";
import { allRequiredSet, IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { IncludePageCommand } from "./includepagecommand.js";
import { libUpdatePage } from "./libupdatepage.js";

export class UpdatePageCommand implements IMutationCommand {
  parts?: Survey;
  pageIndex?: number;
  private page?: Page;
  private defaultLang?: string;
  private readonly includeCommand: IncludePageCommand;

  constructor() {
    this.includeCommand = new IncludePageCommand();
  }

  // #region part items
  private buildParts(survey: Survey, section: mlstring) {
    const builder = new SurveyBuilder();
    libUpdatePage(builder, "updatePage", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  get itemParts(): IDomainCollection<PageItem> | undefined {
    return this.parts?.items;
  }

  get namePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_NAME__"
    ) as PageItem;
  }
  // #endregion

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    index: number,
    section: mlstring = { en: "Update Page", fr: "Mise à jour de la page" }
  ): void {
    this.pageIndex = index;
    this.page = survey.value.pages[index];
    this.defaultLang = survey.options.defaultLang;
    this.buildParts(survey, section);

    survey.insertItems(
      this.pageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    this.includeCommand.start(survey, participant, this.pageIndex, section);

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const name = this.page?.name;
    return DomainCollection(new InterviewItem(this.namePart, name));
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { updatedPage } = this.bindPartItems(survey.value, interviewItems);
    survey.updatePage(this.pageIndex as number, updatedPage);
    this.applyInclude(survey, participant, interviewItems);
    participant.updatePageSets(survey.pageSets);
  }

  applyInclude(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    this.includeCommand.apply(survey, participant, interviewItems);
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { updatedPage: Page } {
    const surveyBuilder = new SurveyBuilder();
    surveyBuilder.options(survey.options);

    const code = getTranslation(
      this.page?.name,
      "__code__",
      survey.options.defaultLang
    ) as string;

    const pageBuilder = surveyBuilder.page(code) as PageBuilder;

    const names = interviewItems.find(i => i.pageItem == this.namePart)
      ?.value as mlstring;

    if (names && typeof names != "string") {
      const langs = Object.entries(names);
      langs.forEach(([lang, name]) => pageBuilder.translate(lang, name));
    } else {
      const defaultLang = survey.options.defaultLang as string;
      pageBuilder.translate(defaultLang, names);
    }

    const newPage = pageBuilder.build([]) as Page;
    const updatedPage = (this.page as Page).update({
      name: newPage.name,
    });
    return { updatedPage };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [...(this.parts?.items as IDomainCollection<PageItem>)];
    return allRequiredSet(allParts, interviewItems);
  }
}
