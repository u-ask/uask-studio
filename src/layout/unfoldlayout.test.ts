import {
  Item,
  ItemTypes,
  PageItem,
  parseLayout,
  SurveyBuilder,
  TableContent,
} from "uask-dom";
import test from "tape";
import {
  UnfoldLayout,
  UnfoldRow,
  UnfoldSection,
  UnfoldTable,
} from "./unfoldlayout.js";

function buildSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("INIT").pages("P1");
  b.page("P1")
    .startSection("section 1")
    .question("Q1", b.types.text)
    .question("row1 -> col1", "R1C1", b.types.integer)
    .question("row1 -> col2", "R1C2", b.types.integer)
    .question("row2 -> col1", "R2C1", b.types.integer)
    .question("row2 -> col2", "R2C2", b.types.integer)
    .question("row3 -> col1", "R3C1", b.types.integer)
    .question("row3 -> col2", "R3C2", b.types.integer)
    .endSection()
    .startSection("section 2")
    .question("Q2", b.types.integer)
    .endSection();
  return b.get();
}

test("Unfold the first table row #303", t => {
  const survey = buildSurvey();
  const layout = parseLayout(survey.pageSets[0].pages[0].items);
  const unfoldedTable = new UnfoldTable(
    layout[0].content[1] as TableContent<Item<"prototype">>,
    survey.pageSets[0].pages[0].items[1]
  );
  const expected = [
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row1 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[1],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row1 -> col2",
      },
      modifiers: { classes: [] },
      item: survey.items[2],
    },
    {
      behavior: "table",
      columns: ["col1", "col2"],
      items: [
        {
          wording: "row2",
          row: [
            {
              item: survey.items[3],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[4],
              modifiers: { classes: undefined },
            },
          ],
        },
        {
          wording: "row3",
          row: [
            {
              item: survey.items[5],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[6],
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the middle table row #303", t => {
  const survey = buildSurvey();
  const layout = parseLayout(survey.pageSets[0].pages[0].items);
  const unfoldedTable = new UnfoldTable(
    layout[0].content[1] as TableContent<Item<"prototype">>,
    survey.pageSets[0].pages[0].items[3]
  );
  const expected = [
    {
      behavior: "table",
      columns: ["col1", "col2"],
      items: [
        {
          wording: "row1",
          row: [
            {
              item: survey.items[1],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[2],
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row2 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[3],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row2 -> col2",
      },
      modifiers: { classes: [] },
      item: survey.items[4],
    },
    {
      behavior: "table",
      columns: ["col1", "col2"],
      items: [
        {
          wording: "row3",
          row: [
            {
              item: survey.items[5],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[6],
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the last table row #303", t => {
  const survey = buildSurvey();
  const layout = parseLayout(survey.pageSets[0].pages[0].items);
  const unfoldedTable = new UnfoldTable(
    layout[0].content[1] as TableContent<Item<"prototype">>,
    survey.pageSets[0].pages[0].items[5]
  );
  const expected = [
    {
      behavior: "table",
      columns: ["col1", "col2"],
      items: [
        {
          wording: "row1",
          row: [
            {
              item: survey.items[1],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[2],
              modifiers: { classes: undefined },
            },
          ],
        },
        {
          wording: "row2",
          row: [
            {
              item: survey.items[3],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[4],
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row3 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[5],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row3 -> col2",
      },
      modifiers: { classes: [] },
      item: survey.items[6],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Instanciate unfold row wrapper #303", t => {
  const { q2, q3, q4, q5, q6, table } = buildTableContent();
  const wrappedTable = new UnfoldRow(table as TableContent<PageItem>, 0);
  const expected = [
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: { en: "row 1 -> column 1", fr: "ligne 1 -> colonne 1" },
      },
      modifiers: { classes: [] },
      item: q2,
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: { en: "row 1 -> column 2", fr: "ligne 1 -> colonne 2" },
      },
      modifiers: { classes: [] },
      item: q3,
    },
    {
      behavior: "table",
      columns: [
        { en: "column 1", fr: "colonne 1" },
        { en: "column 2", fr: "colonne 2" },
      ],
      items: [
        {
          wording: { en: "row 2", fr: "ligne 2" },
          row: [
            null,
            {
              item: q4,
              modifiers: { classes: undefined },
            },
          ],
        },
        {
          wording: { en: "row 3", fr: "ligne 3" },
          row: [
            {
              item: q5,
              modifiers: { classes: undefined },
            },
            {
              item: q6,
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
  ];
  t.deepLooseEqual(wrappedTable, expected);
  t.end();
});

function buildTableContent() {
  const q2 = {
    pageItem: new PageItem(
      { en: "row 1 -> column 1", fr: "ligne 1 -> colonne 1" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q3 = {
    pageItem: new PageItem(
      { en: "row 1 -> column 2", fr: "ligne 1 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q4 = {
    pageItem: new PageItem(
      { en: "row 2 -> column 2", fr: "ligne 2 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q5 = {
    pageItem: new PageItem(
      { en: "row 3 -> column 1", fr: "ligne 3 -> colonne 1" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const q6 = {
    pageItem: new PageItem(
      { en: "row 3 -> column 2", fr: "ligne 3 -> colonne 2" },
      "",
      ItemTypes.text,
      {
        section: "1",
      }
    ),
    context: 0,
  };
  const table = {
    behavior: "table",
    columns: [
      { en: "column 1", fr: "colonne 1" },
      { en: "column 2", fr: "colonne 2" },
    ],
    items: [
      {
        wording: { en: "row 1", fr: "ligne 1" },
        row: [
          {
            item: q2,
            modifiers: { classes: undefined },
          },
          {
            item: q3,
            modifiers: { classes: undefined },
          },
        ],
      },
      {
        wording: { en: "row 2", fr: "ligne 2" },
        row: [
          null,
          {
            item: q4,
            modifiers: { classes: undefined },
          },
        ],
      },
      {
        wording: { en: "row 3", fr: "ligne 3" },
        row: [
          {
            item: q5,
            modifiers: { classes: undefined },
          },
          {
            item: q6,
            modifiers: { classes: undefined },
          },
        ],
      },
    ],
  };
  return { q2, q3, q4, q5, q6, table };
}

test("Unfold a section #303", t => {
  const survey = buildSurvey();
  const layout = parseLayout(survey.pageSets[0].pages[0].items);
  const unfoldedSection = new UnfoldSection(
    layout[0].content,
    survey.pageSets[0].pages[0].items[1]
  );
  const expected = [
    {
      behavior: "item",
      item: survey.items[0],
      labels: {
        comment: undefined,
        wording: "Q1",
      },
      modifiers: { classes: undefined },
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row1 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[1],
    },
    {
      behavior: "item",
      labels: {
        comment: undefined,
        wording: "row1 -> col2",
      },
      modifiers: { classes: [] },
      item: survey.items[2],
    },
    {
      behavior: "table",
      columns: ["col1", "col2"],
      items: [
        {
          wording: "row2",
          row: [
            {
              item: survey.items[3],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[4],
              modifiers: { classes: undefined },
            },
          ],
        },
        {
          wording: "row3",
          row: [
            {
              item: survey.items[5],
              modifiers: { classes: undefined },
            },
            {
              item: survey.items[6],
              modifiers: { classes: undefined },
            },
          ],
        },
      ],
    },
  ];
  t.deepLooseEqual(unfoldedSection, expected);
  t.end();
});

test("Unfold all layout #303", t => {
  const survey = buildSurvey();
  const layout = parseLayout(survey.pageSets[0].pages[0].items);
  const unfolded = new UnfoldLayout(
    layout,
    survey.pageSets[0].pages[0].items[1]
  );
  const expected = [
    {
      title: "section 1",
      content: [
        {
          behavior: "item",
          item: survey.items[0],
          labels: {
            comment: undefined,
            wording: "Q1",
          },
          modifiers: { classes: undefined },
        },
        {
          behavior: "item",
          labels: {
            comment: undefined,
            wording: "row1 -> col1",
          },
          modifiers: { classes: [] },
          item: survey.items[1],
        },
        {
          behavior: "item",
          labels: {
            comment: undefined,
            wording: "row1 -> col2",
          },
          modifiers: { classes: [] },
          item: survey.items[2],
        },
        {
          behavior: "table",
          columns: ["col1", "col2"],
          items: [
            {
              wording: "row2",
              row: [
                {
                  item: survey.items[3],
                  modifiers: { classes: undefined },
                },
                {
                  item: survey.items[4],
                  modifiers: { classes: undefined },
                },
              ],
            },
            {
              wording: "row3",
              row: [
                {
                  item: survey.items[5],
                  modifiers: { classes: undefined },
                },
                {
                  item: survey.items[6],
                  modifiers: { classes: undefined },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "section 2",
      content: [
        {
          behavior: "item",
          item: survey.items[7],
          labels: {
            comment: undefined,
            wording: "Q2",
          },
          modifiers: { classes: undefined },
        },
      ],
    },
  ];
  t.deepLooseEqual(unfolded, expected);
  t.end();
});
