import {
  CrossItemRule,
  DomainCollection,
  getItem,
  getTranslation,
  IDomainCollection,
  InterviewItem,
  Item,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  PageItemBuilder,
  parseLayout,
  Participant,
  Survey,
  SurveyBuilder,
  TableContent,
} from "uask-dom";
import {
  allInRangeSet,
  allLanguagesSet,
  allRequiredSet,
  IMutationCommand,
} from "../command.js";
import { libApply } from "../libapply.js";
import { AllLanguagesSetRule, VariableAndLanguageSetRule } from "../rules.js";
import { libInsertTableLine } from "./libinserttableline.js";

export class InsertTableLineCommand implements IMutationCommand {
  pageIndex?: number;
  pageItemIndex?: number;
  parts?: Survey;
  private item?: PageItem;
  private precedingTable?: TableContent<Item>;
  private section?: string;

  private buildParts(
    survey: Survey,
    section?: string,
    table?: TableContent<Item>
  ) {
    const builder = new SurveyBuilder();
    libInsertTableLine(builder, "insertTableLine", section, table);
    libApply(builder, "apply", section);
    this.parts = builder.get();
    this.parts = this.parts.update({
      crossRules: this.parts.crossRules.append(
        new CrossItemRule(
          this.lineNamePart,
          new AllLanguagesSetRule(survey.options)
        ),
        new CrossItemRule(
          this.columnNamesPart,
          new VariableAndLanguageSetRule(survey.options)
        )
      ),
    });
  }

  get columnNamesPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__COLUMN_NAMES__"
    ) as PageItem;
  }

  get lineNamePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__LINE_NAME__"
    ) as PageItem;
  }

  get positionPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__LINE_POSITION__"
    ) as PageItem;
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    index: number,
    section?: string | undefined
  ): void {
    this.pageIndex = pageIndex;
    this.pageItemIndex = index;
    this.section = section;

    this.precedingTable = this.getPrecedingTable(survey, pageIndex, index);

    this.buildParts(survey, section, this.precedingTable);
    survey.insertItems(
      this.pageIndex,
      this.pageItemIndex,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    const interviewItems = this.getPartItems(this.precedingTable);

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(interviewItems);
  }

  private getPrecedingTable(
    survey: Survey,
    pageIndex: number,
    pageItemIndex: number
  ): TableContent<Item> | undefined {
    const item = survey.pages[pageIndex].items[pageItemIndex - 1];
    const layout = parseLayout(survey.pages[pageIndex].items);
    const tableContainingItem = layout
      .flatMap(s => s.content)
      .find(c => {
        switch (c.behavior) {
          case "table":
            return !!c.items.find(
              r => !!r.row.find(i => getItem(i?.item as Item) == getItem(item))
            );
          case "item" || "richItem":
            return getItem(c.item) == getItem(item);
          case "recordset":
            return false;
        }
      });
    return tableContainingItem && tableContainingItem.behavior == "table"
      ? tableContainingItem
      : undefined;
  }

  private getPartItems(
    table?: TableContent<Item>
  ): IDomainCollection<InterviewItem> {
    if (!table)
      return DomainCollection(new InterviewItem(this.positionPart, 1));
    const columnNames = table
      ? table.columns.map(c => ({ name: undefined, label: c }))
      : [];
    return DomainCollection(
      new InterviewItem(this.positionPart, table.items.length + 1),
      new InterviewItem(this.columnNamesPart, columnNames)
    );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { insertedItems, insertedRules } = this.bindPartItems(
      survey.value,
      interviewItems
    );

    const lineIndex = this.getPosition(survey, participant, interviewItems);
    survey.insertItems(
      this.pageIndex as number,
      lineIndex as number,
      insertedItems,
      insertedRules
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(DomainCollection(...insertedItems));
  }

  private getPosition(
    survey: Survey,
    participant: Participant,
    interviewItems: InterviewItem[]
  ): number {
    const position = interviewItems.find(ii => ii.pageItem == this.positionPart)
      ?.value as number;
    if (
      position &&
      this.precedingTable &&
      position <= this.precedingTable?.items?.length
    ) {
      const rowIndex = position - 1;
      return survey.pages[this.pageIndex as number].items.findIndex(
        pi => pi == this.precedingTable?.items[rowIndex].row[0]?.item
      );
    }
    return this.pageItemIndex as number;
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { insertedItems: PageItem[]; insertedRules: CrossItemRule[] } {
    const b = new SurveyBuilder();
    b.options(survey.options);
    const lineName = interviewItems.find(ii => ii.pageItem == this.lineNamePart)
      ?.value as mlstring;
    const columnsNames = (
      interviewItems.find(ii => ii.pageItem == this.columnNamesPart)?.value as {
        name: string;
        label: mlstring;
      }[]
    )?.map(c => c.label) as mlstring[];
    const varNames = (
      interviewItems.find(ii => ii.pageItem == this.columnNamesPart)?.value as {
        name: string;
        label: mlstring;
      }[]
    )?.map(c => c.name) as string[];

    const insertedItems = columnsNames.map((colName, index) => {
      let pageItemBuilder = b.question(
        `${getTranslation(
          lineName,
          survey.options.defaultLang
        )} -> ${getTranslation(colName, survey.options.defaultLang)}`,
        varNames[index],
        b.types.text,
        this.section
      );
      survey.options.languages
        ?.filter(l => l != survey.options.defaultLang)
        .map(
          l =>
            (pageItemBuilder = pageItemBuilder.translate(
              l,
              `${getTranslation(lineName, l)} -> ${getTranslation(colName, l)}`
            ) as PageItemBuilder)
        );
      return pageItemBuilder.build([]);
    });

    return { insertedItems, insertedRules: [] };
  }

  canApply(survey: MutableSurvey, interviewItems: InterviewItem[]): boolean {
    return (
      allRequiredSet(
        [...(this.parts?.items as IDomainCollection<PageItem>)],
        interviewItems
      ) &&
      allInRangeSet(
        [...(this.parts?.items as IDomainCollection<PageItem>)],
        interviewItems
      ) &&
      allLanguagesSet(
        [...(this.parts?.items as IDomainCollection<PageItem>)],
        interviewItems
      )
    );
  }
}
