import {
  getItem,
  MutableParticipant,
  MutableSurvey,
  parseLayout,
  Participant,
  ParticipantBuilder,
  Sample,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { UpdateItemCommand } from "../commands/index.js";
import { UnfoldLayout } from "./unfoldlayout.js";

function buildSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1").pages("P1");
  b.page("P1")
    .startSection("section 1")
    .question("Q1", b.types.text)
    .question("row1 -> col1", "R1C1", b.types.integer)
    .question("row1 -> col2", "R1C2", b.types.integer)
    .question("row1 -> col3", "R1C3", b.types.integer)
    .question("row2 -> col1", "R2C1", b.types.integer)
    .question("row2 -> col2", "R2C2", b.types.integer)
    .question("row2 -> col3", "R2C3", b.types.integer)
    .question("row3 -> col1", "R3C1", b.types.integer)
    .question("row3 -> col2", "R3C2", b.types.integer)
    .question("row3 -> col3", "R3C3", b.types.integer)
    .endSection()
    .startSection("section 2")
    .question("Q2", b.types.integer)
    .endSection();
  const survey = b.get();
  const pb = new ParticipantBuilder(survey, "1", new Sample("A"));
  pb.interview("PS1")
    .item("R1C1")
    .value(11)
    .item("R1C2")
    .value(12)
    .item("R1C3")
    .value(13)
    .item("R2C1")
    .value(21)
    .item("R2C2")
    .value(22)
    .item("R2C3")
    .value(23)
    .item("R3C1")
    .value(31)
    .item("R3C2")
    .value(32)
    .item("R3C3")
    .value(33);
  const participant = pb.build();
  return { survey, participant };
}

test("Unfold the first row, first col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    1
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [makeRow(survey, "row1", null, 2, 3)],
    },
    {
      behavior: "item",
      labels: {
        wording: "row1 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[1],
    },
    ...partItems,
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row2", 4, 5, 6),
        makeRow(survey, "row3", 7, 8, 9),
      ],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the first row, last col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    3
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [makeRow(survey, "row1", 1, 2, null)],
    },
    {
      behavior: "item",
      labels: {
        wording: "row1 -> col3",
      },
      modifiers: { classes: [] },
      item: survey.items[3],
    },
    ...partItems,
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row2", 4, 5, 6),
        makeRow(survey, "row3", 7, 8, 9),
      ],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the middle row, first col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    4
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row1", 1, 2, 3),
        makeRow(survey, "row2", null, 5, 6),
      ],
    },
    {
      behavior: "item",
      labels: {
        wording: "row2 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[4],
    },
    ...partItems,
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [makeRow(survey, "row3", 7, 8, 9)],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the middle row, middle col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    5
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row1", 1, 2, 3),
        makeRow(survey, "row2", 4, null, 6),
      ],
    },
    {
      behavior: "item",
      labels: {
        wording: "row2 -> col2",
      },
      modifiers: { classes: [] },
      item: survey.items[5],
    },
    ...partItems,
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [makeRow(survey, "row3", 7, 8, 9)],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the middle row, last col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    6
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row1", 1, 2, 3),
        makeRow(survey, "row2", 4, 5, null),
      ],
    },
    {
      behavior: "item",
      labels: {
        wording: "row2 -> col3",
      },
      modifiers: { classes: [] },
      item: survey.items[6],
    },
    ...partItems,
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [makeRow(survey, "row3", 7, 8, 9)],
    },
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the last row, first col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    7
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row1", 1, 2, 3),
        makeRow(survey, "row2", 4, 5, 6),
        makeRow(survey, "row3", null, 8, 9),
      ],
    },
    {
      behavior: "item",
      labels: {
        wording: "row3 -> col1",
      },
      modifiers: { classes: [] },
      item: survey.items[7],
    },
    ...partItems,
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

test("Unfold the last row, last col #303", t => {
  const { survey, participant } = buildSurvey();
  const { layout, unfoldedTable, partItems } = applyStudio(
    survey,
    participant,
    9
  );
  const expected = [
    layout[0].content[0],
    {
      behavior: "table",
      columns: ["col1", "col2", "col3"],
      items: [
        makeRow(survey, "row1", 1, 2, 3),
        makeRow(survey, "row2", 4, 5, 6),
        makeRow(survey, "row3", 7, 8, null),
      ],
    },
    {
      behavior: "item",
      labels: {
        wording: "row3 -> col3",
      },
      modifiers: { classes: [] },
      item: survey.items[9],
    },
    ...partItems,
  ];
  t.deepLooseEqual(unfoldedTable, expected);
  t.end();
});

function makeRow(
  survey: Survey,
  wording: string,
  ...indexes: (number | null)[]
) {
  return {
    wording,
    row: indexes.map(i => {
      return i
        ? {
            item: survey.items[i],
            modifiers: { classes: undefined },
          }
        : null;
    }),
  };
}

function applyStudio(
  survey: Survey,
  participant: Participant,
  itemIndex: number
) {
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateItemCommand();
  command.start(mutableSurvey, mutableParticipant, 0, itemIndex);
  const layout = parseLayout(mutableSurvey.pageSets[0].pages[0].items);
  const partItems = layout[0].content.filter(
    c => "item" in c && command.parts?.items.includes(getItem(c.item))
  );
  const unfoldedTable = new UnfoldLayout(
    layout,
    mutableSurvey.pageSets[0].pages[0].items[itemIndex]
  )[0].content;
  return { layout, unfoldedTable, partItems };
}
