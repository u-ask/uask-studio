import {
  Survey,
  Page,
  SurveyBuilder,
  MutableSurvey,
  IDomainCollection,
  InterviewItem,
  PageBuilder,
  PageItem,
  CrossItemRule,
  DomainCollection,
  getTranslation,
  MutableParticipant,
  Scope,
  execute,
} from "uask-dom";
import { UpdatePageCommand } from "../update/updatepagecommand.js";
import { IMutationCommand, allRequiredSet, allUniqueSet } from "../command.js";
import { libInsertPage } from "./libinsertpage.js";
import { UniquePageRule } from "../rules.js";

export class InsertPageCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private readonly updateCommand: UpdatePageCommand;
  private page?: Page;
  private indexNewPage?: number;
  private defaultLang?: string;

  constructor() {
    this.updateCommand = new UpdatePageCommand();
  }

  private buildParts(survey: Survey) {
    const builder = new SurveyBuilder();
    libInsertPage(builder, "insertPage", {
      en: "Insert Page",
      fr: "Insérer une page",
    });
    this.parts = builder.get();
    this.parts = this.parts?.update({
      crossRules: this.parts.crossRules.append(
        new CrossItemRule(
          this.codePart,
          new UniquePageRule(survey, this.page as Page)
        )
      ),
    });
  }

  get codePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_CODE__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number,
    pageIndex: number
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageIndex = pageIndex;
    this.indexNewPage = pageIndex;
    this.defaultLang = survey.options.defaultLang;

    this.page = this.buildNewPage();
    survey.insertPage(pageSetIndex, pageIndex, this.page);
    this.surveyPageIndex = survey.pages.findIndex(page => page == this.page);

    this.updateCommand.start(survey, participant, this.surveyPageIndex, {
      en: "Insert Page",
      fr: "Insérer une page",
    });

    this.buildParts(survey);

    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private buildNewPage() {
    const pageBuilder = new SurveyBuilder()
      .page("PAGE")
      .translate("en", "New Page")
      .translate("fr", "Nouvelle Page") as PageBuilder;
    return pageBuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const code = getTranslation(this.page?.name, "__code__", this.defaultLang);
    return DomainCollection(
      ...this.getPartMessages(new InterviewItem(this.codePart, code))
    );
  }

  private getPartMessages(...items: InterviewItem[]) {
    const scope = Scope.create([]).with(items);
    return execute((this.parts as Survey).rules, scope).items;
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { insertedPage } = this.bindPartItems(survey, interviewItems);
    survey.insertPage(
      this.pageSetIndex as number,
      this.indexNewPage as number,
      insertedPage
    );
    this.updateCommand.applyInclude(survey, participant, interviewItems);
    participant.updatePageSets(survey.pageSets);
  }

  private bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { insertedPage: Page } {
    const code = {
      __code__: interviewItems.find(i => i.pageItem == this.codePart)
        ?.value as string,
    };
    const { updatedPage } = this.updateCommand.bindPartItems(
      survey,
      interviewItems
    );
    const insertedPage = updatedPage.update({
      name: {
        ...(typeof updatedPage.name == "string"
          ? { [survey.options.defaultLang as string]: updatedPage.name }
          : updatedPage.name),
        ...code,
      },
    });
    return { insertedPage };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [
      ...(this.updateCommand.parts?.items as IDomainCollection<PageItem>),
      ...(this.parts?.items as IDomainCollection<PageItem>),
    ];
    return (
      allRequiredSet(allParts, interviewItems) &&
      allUniqueSet(allParts, interviewItems)
    );
  }
}
