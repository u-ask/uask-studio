import {
  getItem,
  getItemWording,
  getTranslation,
  IDomainCollection,
  Item,
  ItemContent,
  LayoutSection,
  mlstring,
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
  previousTable?: UnfoldTable;

  constructor(sectionContent: LayoutContent[], pageItem: Item) {
    super();
    const section = sectionContent.reduce((acc, i) => {
      switch (i.behavior) {
        case "item":
          acc.push(i);
          break;
        case "table":
          this.previousTable = new UnfoldTable(i, pageItem, this.previousTable);
          acc.push(...this.previousTable);
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
    Object.defineProperty(this, "previousTable", { enumerable: false });
  }
}

export class UnfoldTable extends Array<TableContent<Item> | ItemContent<Item>> {
  firstPart = false;

  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    pageItem: Item,
    knownTable: UnfoldTable | undefined
  ) {
    super();
    if (!knownTable?.firstPart) {
      const itemIndex = this.getItemIndex(table, pageItem);
      if (itemIndex > -1) {
        this.firstPart = true;
        this.push(new UnfoldTableFirstPart(table, itemIndex));
        this.push(new ExtractItem(table, itemIndex));
      } else this.push(table);
    } else {
      const firstPart = knownTable[0] as UnfoldTableFirstPart;
      firstPart.setColumnSubset(table);

      const secondPart = new UnfoldTableSecondPart(table, firstPart.columns);
      if (firstPart.hasCommonRow(secondPart))
        firstPart.shiftCommonRow(secondPart);

      if (secondPart.items.length > 0) this.push(secondPart);
    }
    Object.defineProperty(this, "starter", { enumerable: false });
  }

  private getItemIndex(
    table: TableContent<Item<"prototype" | "instance">>,
    pageItem: Item<"prototype" | "instance">
  ) {
    const lastRow = table.items[table.items.length - 1];
    return lastRow.row.findIndex(
      c =>
        c?.item != null &&
        getItem(c.item).variableName == getItem(pageItem).variableName
    );
  }
}

class UnfoldTableSecondPart implements TableContent<Item> {
  behavior: "table" = "table";
  columns: mlstring[];
  items: TableContent<Item>["items"];

  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    columns: mlstring[]
  ) {
    const colIndexes = columns.map(c =>
      table.columns.findIndex(c2 => getTranslation(c) == getTranslation(c2))
    );
    this.items = table.items.map(i => {
      return {
        wording: i.wording,
        row: colIndexes.map(x => i.row[x] ?? null),
      };
    });
    this.columns = colIndexes.map(i => table.columns[i]);
  }
}

class ExtractItem implements ItemContent<Item> {
  behavior: "item" = "item";
  labels: ItemContent<Item>["labels"];
  modifiers: ItemContent<Item>["modifiers"];
  item: Item;

  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    itemIndex: number
  ) {
    const lastRow = table.items[table.items.length - 1];
    const { item, modifiers } = lastRow.row[itemIndex] as {
      item: Item;
      modifiers: { classes: string[] };
    };
    this.item = item;
    this.modifiers = { ...modifiers, classes: modifiers.classes ?? [] };
    this.labels = {
      wording: getItemWording(item),
    };
  }
}

class UnfoldTableFirstPart implements TableContent<Item> {
  behavior: "table" = "table";
  columns: mlstring[];
  items: TableContent<Item>["items"];
  private currentRow: typeof this.items[0];

  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    itemIndex: number
  ) {
    const lastRow = table.items[table.items.length - 1];
    const newRow = { ...lastRow, row: [...lastRow.row] };
    newRow.row[itemIndex] = null;
    this.columns = table.columns;
    this.items = [...table.items.slice(0, -1), newRow];
    this.currentRow = this.items[this.items.length - 1];
    Object.defineProperty(this, "currentRow", { enumerable: false });
  }

  hasCommonRow(reorderedTable: UnfoldTableSecondPart) {
    return (
      getTranslation(reorderedTable.items[0].wording) ==
      getTranslation(this.currentRow.wording)
    );
  }

  shiftCommonRow(reorderedTable: UnfoldTableSecondPart) {
    this.currentRow.row = this.columns.map(
      (_, x) => this.currentRow.row[x] ?? reorderedTable.items[0].row[x]
    );
    reorderedTable.items.shift();
  }

  setColumnSubset(table: TableContent<Item>) {
    const columnCount =
      this.items.length == 1 && table.items.length == 1
        ? this.columns.length + table.columns.length
        : this.items.length > 1
        ? this.columns.length
        : table.columns.length;
    this.columns = [...this.columns, ...table.columns].slice(0, columnCount);
  }
}
