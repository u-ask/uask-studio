import {
  MutableSurvey,
  PageItem,
  getItem,
  getScopedItem,
  CrossItemRule,
  MutableParticipant,
  InterviewItem,
  Survey,
  SurveyBuilder,
  IDomainCollection,
  DomainCollection,
  Page,
  mlstring,
} from "uask-dom";
import { IMutationCommand } from "./command.js";
import { libApply } from "./libapply.js";
import { libOrderItem } from "./liborderitem.js";

export class OrderItemCommand implements IMutationCommand {
  pageIndex?: number;
  pageItemIndex?: number;
  parts?: Survey;
  private page?: Page;
  private pageItem?: PageItem;
  private crossRules?: CrossItemRule[];

  private buildParts(section?: string) {
    const builder = new SurveyBuilder();
    libOrderItem(builder, "orderItem", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  get directionPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_DIRECTION__"
    ) as PageItem;
  }

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    index: number
  ): void {
    this.pageIndex = pageIndex;
    this.pageItemIndex = index;
    this.page = survey.pages[pageIndex];
    this.pageItem = getItem(this.page.items[index]);
    this.crossRules = [
      ...survey.crossRules.filter(rule =>
        rule.pageItems.some(pi => getScopedItem(pi) == this.pageItem)
      ),
    ];
    this.buildParts(this.pageItem?.section as string);
    survey.insertItems(
      pageIndex,
      index + 1,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    return DomainCollection(
      new InterviewItem(this.directionPart, undefined),
      new InterviewItem(this.applyPart, undefined)
    );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    items: InterviewItem[]
  ): void {
    const direction = items.find(
      i => i.pageItem == this.directionPart
    ) as InterviewItem;
    const shift = direction.value == "up" ? -1 : 1;
    const includeIndex = survey.pages.findIndex(p =>
      p.includes.includes(this.pageItem as PageItem)
    );
    const pageItemIndex = survey.pages[includeIndex].includes.indexOf(
      this.pageItem as PageItem
    );
    const toIndex = pageItemIndex + shift;
    const isFirstOrLast = this.firstOrLast(survey, includeIndex, toIndex);

    const toSection = (survey.pages[includeIndex].includes[toIndex] as PageItem)
      ?.section;

    if (!isFirstOrLast && this.pageItem?.section == toSection)
      this.moveInSection(survey, includeIndex, pageItemIndex, toIndex);
    else this.changeSection(survey, toSection);

    participant.updatePageSets(survey.pageSets);
    this.pageItemIndex = (this.pageItemIndex ?? 0) + shift;
  }

  private firstOrLast(
    survey: Survey,
    includeIndex: number,
    newIndex: number
  ): boolean {
    const firstItemInInclude = newIndex == -1;
    const lastItemInInclude =
      survey.pages[includeIndex].items.length == newIndex;
    return firstItemInInclude || lastItemInInclude;
  }

  private moveInSection(
    survey: MutableSurvey,
    includeIndex: number,
    fromIndex: number,
    toIndex: number
  ): void {
    survey.deleteInclude(includeIndex, fromIndex);
    survey.insertInclude(includeIndex, toIndex, this.pageItem as PageItem);
  }

  private changeSection(
    survey: MutableSurvey,
    toSection: mlstring | undefined
  ): void {
    const newItem = this.pageItem?.update({ section: toSection });
    survey.updateItem(
      this.pageIndex as number,
      this.pageItemIndex as number,
      newItem as PageItem,
      []
    );
  }

  canApply(survey: Survey, items: InterviewItem[]): boolean {
    const directionPart = items.find(
      i => i.pageItem.variableName == "__ITEM_DIRECTION__"
    );
    return (
      typeof directionPart != "undefined" &&
      (directionPart.value == "up" || directionPart.value == "down")
    );
  }
}
