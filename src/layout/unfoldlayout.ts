import {
  getItem,
  IDomainCollection,
  Item,
  ItemContent,
  ItemWithContext,
  LayoutSection,
  mlstring,
  PageItem,
  RecordsetContent,
  RichItemContent,
  TableContent,
} from "uask-dom";

export class UnfoldLayout extends Array<LayoutSection<Item>> {
  constructor(layout: IDomainCollection<LayoutSection<Item>>, pageItem: Item) {
    super();
    super.push(
      ...layout.map(l => ({
        title: l.title,
        content: new UnfoldSection(l.content, pageItem),
      }))
    );
  }
}

type LayoutContent =
  | ItemContent<Item>
  | TableContent<Item>
  | RichItemContent<Item>
  | RecordsetContent<Item>;

export class UnfoldSection extends Array<LayoutContent> {
  constructor(sectionContent: LayoutContent[], pageItem: Item) {
    super();
    const section = sectionContent.reduce((acc, i) => {
      switch (i.behavior) {
        case "item":
          acc.push(i);
          break;
        case "table":
          acc.push(...new UnfoldTable(i, pageItem));
          break;
        case "richItem":
          acc.push(i);
          break;
        case "recordset":
          acc.push(i);
          break;
      }
      return acc;
    }, [] as LayoutContent[]);
    this.push(...section);
  }
}

export class UnfoldTable extends Array<LayoutContent> {
  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    pageItem: Item
  ) {
    super();
    const rowIndex = table.items.findIndex(i =>
      i.row.find(
        r =>
          getItem(r?.item as Item).variableName ==
          getItem(pageItem).variableName
      )
    );
    if (rowIndex != -1) this.push(...new RowWrapper(table, rowIndex));
    else this.push(table);
  }
}

type LayoutRow = TableContent<Item> | ItemContent<Item>;

export class UnfoldRow extends Array<LayoutRow> {
  constructor(table: TableContent<Item>, rowIndex: number) {
    super();
    if (rowIndex != 0) super.push(this.getBeforeRowIndex(table, rowIndex));
    super.push(...this.getExtandedRow(table, rowIndex));
    if (rowIndex != table.items.length - 1)
      super.push(this.getAfterRowIndex(table, rowIndex));
  }

  private getAfterRowIndex(
    table: TableContent<Item>,
    rowIndex: number
  ): TableContent<Item> {
    return {
      behavior: "table",
      columns: table.columns,
      items: table.items.slice(rowIndex + 1),
    };
  }

  private getExtandedRow(
    table: TableContent<Item>,
    rowIndex: number
  ): ItemContent<Item>[] {
    return table.items[rowIndex].row.map(cell => {
      const pageItem = cell ? getItem(cell?.item as Item) : undefined;
      return {
        behavior: "item",
        labels: {
          comment: pageItem?.comment,
          wording: pageItem?.wording as mlstring,
        },
        modifiers: { classes: cell?.modifiers.classes ?? [] },
        item: cell?.item as Item,
      };
    });
  }

  private getBeforeRowIndex(
    table: TableContent<Item>,
    rowIndex: number
  ): TableContent<Item> {
    return {
      behavior: "table",
      columns: table.columns,
      items: table.items.slice(0, rowIndex),
    };
  }
}

export const RowWrapper = UnfoldRow;
