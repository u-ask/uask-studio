import {
  MutableSurvey,
  MutableParticipant,
  InterviewItem,
  Survey,
  PageItem,
  SurveyBuilder,
  IDomainCollection,
  CrossItemRule,
  DomainCollection,
  Library,
  getTranslation,
  getItem,
  Page,
  mlstring,
} from "uask-dom";
import { allRequiredSet, IMutationCommand } from "../command.js";
import { libIncludePage } from "./libincludepage.js";

export class IncludePageCommand implements IMutationCommand {
  pageIndex?: number;
  parts?: Survey;
  private library?: Library;

  private buildParts(survey: Survey, section?: mlstring) {
    const builder = new SurveyBuilder();
    libIncludePage(builder, "includePage", survey, section);
    this.parts = builder.get();
  }

  get includePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__INCLUDE__"
    ) as PageItem;
  }

  get pageCodePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__INCLUDE_PAGE__"
    ) as PageItem;
  }

  get selectorParts(): Record<string, PageItem> {
    return (this.parts as Survey).items
      .filter(i => i.variableName.startsWith("__INCLUDE_SELECT_"))
      .reduce((parts, i) => {
        const code = i.variableName.slice(17, -2);
        return { ...parts, [code]: i };
      }, {});
  }

  get contextPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__INCLUDE_CONTEXT__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    section?: mlstring
  ): void {
    this.pageIndex = pageIndex;
    this.buildParts(survey, section);
    this.library = survey.pages[pageIndex].includes.find(
      (i): i is Library => i instanceof Library
    );

    survey.insertItems(
      pageIndex,
      1,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const include = !!this.library;
    const pageCode = getTranslation(this.library?.page.name, "__code__");
    const context = this.library?.contexts
      ? (this.library.contexts[0].context as number) + 1
      : undefined;
    return DomainCollection(
      new InterviewItem(this.includePart, include),
      new InterviewItem(this.pageCodePart, pageCode),
      ...this.selectorItems(this.selectorParts, pageCode),
      new InterviewItem(this.contextPart, context)
    );
  }

  private selectorItems(
    selectorParts: Record<string, PageItem>,
    pageCode: string | undefined
  ): InterviewItem[] {
    const getValue = (code: string) => {
      if (code != pageCode) return undefined;
      const lib = this.library as Library;
      const pageItems =
        typeof lib.pageItems == "undefined"
          ? lib.page.items.map(i => getItem(i).variableName)
          : lib.pageItems?.map(i => i.variableName);
      return [...pageItems];
    };
    return Object.entries(selectorParts).map(
      ([code, p]) => new InterviewItem(p, getValue(code))
    );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const include = !!interviewItems.find(i => i.pageItem == this.includePart)
      ?.value;
    if (include) {
      const { includedLibrary } = this.bindPartItems(survey, interviewItems);
      const pageIndex = this.pageIndex as number;

      if (typeof this.library == "undefined")
        survey.insertInclude(
          pageIndex,
          survey.pages[pageIndex].includes.length,
          includedLibrary
        );
      else
        survey.updateInclude(
          pageIndex,
          survey.pages[pageIndex].includes.indexOf(this.library),
          includedLibrary
        );

      const itemsWithContext = includedLibrary.contexts?.map(
        ({ pageItem, context }) =>
          new InterviewItem(pageItem, undefined, { context })
      ) as IDomainCollection<InterviewItem>;

      participant.updatePageSets(survey.pageSets);
      participant.insertItems(itemsWithContext);
    }
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): {
    includedLibrary: Library;
  } {
    const pageCode = interviewItems.find(i => i.pageItem == this.pageCodePart)
      ?.value as string;
    const variableNames = interviewItems.find(
      i => i.pageItem == this.selectorParts[pageCode]
    )?.value as string[] | undefined;
    const context = interviewItems.find(i => i.pageItem == this.contextPart)
      ?.value as number | undefined;

    const page = survey.pages.find(
      p => getTranslation(p.name, "__code__") == pageCode
    ) as Page;
    const allPageItems = page.items.map(i => getItem(i));
    const pageItems = variableNames
      ? allPageItems.filter(i => variableNames.includes(i.variableName))
      : allPageItems;
    const contexts = context
      ? pageItems.map(i => ({ pageItem: i, context: context - 1 }))
      : undefined;
    const includedLibrary = new Library(page, pageItems, contexts);
    return { includedLibrary };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [...(this.parts?.items as IDomainCollection<PageItem>)];
    return allRequiredSet(allParts, interviewItems);
  }
}
