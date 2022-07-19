import {
  getItem,
  getItemWording,
  getTranslation,
  IDomainCollection,
  Item,
  ItemContent,
  LayoutSection,
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
  starter = false;

  constructor(
    table: TableContent<Item<"prototype" | "instance">>,
    pageItem: Item,
    currentTable: UnfoldTable | undefined
  ) {
    super();
    if (currentTable?.starter) {
      const starter = currentTable[0] as TableContent<Item>;
      const columnCount =
        starter.items.length == 1 && table.items.length == 1
          ? starter.columns.length + table.columns.length
          : starter.items.length > 1
          ? starter.columns.length
          : table.columns.length;
      const columns = [...starter.columns, ...table.columns].slice(
        0,
        columnCount
      );
      starter.columns = columns;
      const currentRow = starter.items[starter.items.length - 1];
      currentRow.row = columns.map((_, x) => currentRow.row[x] ?? null);

      const colIndexes = columns.map(c =>
        table.columns.findIndex(c2 => getTranslation(c) == getTranslation(c2))
      );
      const items = table.items.map(i => {
        return {
          wording: i.wording,
          row: colIndexes.map(x => i.row[x] ?? null),
        };
      });
      if (
        getTranslation(items[0].wording) == getTranslation(currentRow.wording)
      ) {
        currentRow.row = columns.map(
          (_, x) => currentRow.row[x] ?? items[0].row[x]
        );
        items.shift();
      }
      if (items.length > 0)
        this.push({
          behavior: "table",
          columns: colIndexes.map(i => table.columns[i]),
          items,
        });
    } else {
      const lastRow = table.items[table.items.length - 1];
      const itemIndex = lastRow.row.findIndex(
        c =>
          c?.item != null &&
          getItem(c.item).variableName == getItem(pageItem).variableName
      );
      if (itemIndex > -1) {
        const { item, modifiers } = lastRow.row[itemIndex] as {
          item: Item;
          modifiers: { classes: string[] };
        };
        const newRow = { ...lastRow, row: [...lastRow.row] };
        newRow.row[itemIndex] = null;
        this.push({
          behavior: "table",
          columns: table.columns,
          items: [...table.items.slice(0, -1), newRow],
        });
        this.push({
          behavior: "item",
          item: item,
          modifiers: { ...modifiers, classes: modifiers.classes ?? [] },
          labels: {
            wording: getItemWording(item),
          },
        });
        this.starter = true;
      } else this.push(table);
    }
    Object.defineProperty(this, "starter", { enumerable: false });
  }
}
