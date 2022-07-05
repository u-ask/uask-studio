import {
  CrossItemRule,
  getItem,
  IDomainCollection,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import { IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { libDeleteItem } from "./libdeleteitem.js";

export class DeleteItemCommand implements IMutationCommand {
  pageIndex?: number;
  pageItemIndex?: number;
  parts?: Survey;
  private items?: IDomainCollection<PageItem>;
  count = 1;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  private buildParts(section?: string) {
    const builder = new SurveyBuilder();
    libDeleteItem(builder, "updateItem", section);
    libApply(builder, "apply", section);
    this.parts = builder.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    index: number,
    count = 1
  ): void {
    this.pageIndex = pageIndex;
    this.count = count;
    this.items = survey.value.pages[pageIndex].items
      .slice(index, index + count)
      .map(i => getItem(i));
    this.pageItemIndex = index;

    this.buildParts(this.items.last?.section as string);

    survey.insertItems(
      pageIndex,
      index + count,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );
    participant.updatePageSets(survey.pageSets);
  }

  apply(survey: MutableSurvey, participant: MutableParticipant): void {
    for (let i = 0; i < this.count; i++) {
      survey.deleteItem(this.pageIndex as number, this.pageItemIndex as number);
    }

    participant.updatePageSets(survey.pageSets);
    for (const item of this.items as IDomainCollection<PageItem>) {
      participant.deleteItem(item);
    }
    this.pageItemIndex = -1;
  }

  canApply(): boolean {
    return true;
  }
}
