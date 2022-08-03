import {
  MutableSurvey,
  IDomainCollection,
  InterviewItem,
  Survey,
  PageItem,
  SurveyBuilder,
  DomainCollection,
  CrossItemRule,
  getScopedItem,
  getScope,
  Rules,
  RuleName,
  MutableParticipant,
  execute,
  Scope,
  mlstring,
  isML,
} from "uask-dom";
import { allUniqueSet, allRequiredSet, IMutationCommand } from "../command.js";
import { libInsertItem } from "./libinsertitem.js";
import { UpdateItemCommand } from "../update/updateitemcommand.js";
import { UniquePageItemRule } from "../rules.js";

export class InsertItemCommand implements IMutationCommand {
  pageIndex?: number;
  pageItemIndex?: number;
  parts?: Survey;
  private item?: PageItem;
  private readonly updateCommand: UpdateItemCommand;

  constructor() {
    this.updateCommand = new UpdateItemCommand();
  }

  private buildParts(survey: Survey, section?: string) {
    const builder = new SurveyBuilder();
    libInsertItem(builder, "insertItem", section);
    this.parts = builder.get();
    this.parts = this.parts.update({
      crossRules: this.parts.crossRules.append(
        new CrossItemRule(this.variableNamePart, new UniquePageItemRule(survey))
      ),
    });
  }

  get variableNamePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_VARIABLE_NAME__"
    ) as PageItem;
  }

  get isRecordPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ISRECORD__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    index: number,
    section?: string
  ): void {
    this.pageIndex = pageIndex;
    this.pageItemIndex = index;

    this.item = this.buildNewItem(survey, section);
    survey.insertItem(pageIndex, index, this.item, []);

    this.updateCommand.start(survey, participant, pageIndex, index);

    this.buildParts(survey, section);
    survey.insertItems(
      this.pageIndex,
      this.pageItemIndex + 1,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private buildNewItem(survey: MutableSurvey, section: string | undefined) {
    const b = new SurveyBuilder();
    b.options(survey.value.options);
    const pageItemBuilder = b.question(
      { en: "New Item", fr: "Nouvelle Question" },
      "NEW_ITEM",
      b.types.text,
      section
    );
    return pageItemBuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const variableName = this.item?.variableName;
    return DomainCollection(
      ...this.getPartMessages(
        new InterviewItem(this.variableNamePart, variableName),
        new InterviewItem(this.isRecordPart, undefined)
      )
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
    const { insertedItem, insertedRules } = this.bindPartItems(
      survey.value,
      interviewItems
    );
    survey.insertItem(
      this.pageIndex as number,
      this.pageItemIndex as number,
      insertedItem,
      insertedRules
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItem(insertedItem);
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { insertedItem: PageItem; insertedRules: CrossItemRule[] } {
    const { updatedItem, updatedRules } = this.updateCommand.bindPartItems(
      survey,
      interviewItems
    );
    const variableName = interviewItems.find(
      i => i.pageItem == this.variableNamePart
    )?.value;
    const isRecord = interviewItems.some(
      i => i.pageItem == this.isRecordPart && !!i.value
    );
    const wording = isRecord
      ? this.toRecord(updatedItem.wording)
      : updatedItem.wording;

    const insertedItem = updatedItem.update({
      variableName: variableName as string,
      wording,
    });
    const insertedRules = updatedRules.map(
      r =>
        new CrossItemRule(
          r.pageItems.update(i =>
            getScopedItem(i) == updatedItem ? [insertedItem, getScope(i)] : i
          ),
          Rules.create({ name: r.name as RuleName, ...r.args }),
          r.when
        )
    );
    return { insertedItem, insertedRules };
  }

  toRecord(wording: mlstring | mlstring[]): mlstring | mlstring[] {
    if (Array.isArray(wording))
      return wording.map(w => this.toRecord(w) as mlstring);
    if (isML(wording))
      return Object.entries(wording).reduce((res, [lang, w]) => {
        return { ...res, [lang]: this.toRecord(w) as string };
      }, {} as Record<string, string>);
    return ` -> ${wording}`;
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
