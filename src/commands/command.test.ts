import { InterviewItem, ItemTypes, PageItem } from "uask-dom";
import test from "tape";
import { allRequiredSet } from "./command.js";

test("required items should be set", t => {
  const pageItem = new PageItem("Q", "Q", ItemTypes.acknowledge);
  const set = allRequiredSet(
    [pageItem],
    [new InterviewItem(pageItem, undefined)]
  );
  t.ok(set);
  const notSet = allRequiredSet(
    [pageItem],
    [
      new InterviewItem(pageItem, undefined, {
        messages: { required: "value is required" },
      }),
    ]
  );
  t.notOk(notSet);
  t.end();
});

test("required items should be set only for given parts", t => {
  const pageItem1 = new PageItem("Q", "Q", ItemTypes.acknowledge);
  const pageItem2 = new PageItem("T", "T", ItemTypes.acknowledge);
  const set = allRequiredSet(
    [pageItem1],
    [
      new InterviewItem(pageItem1, undefined),
      new InterviewItem(pageItem2, undefined, {
        messages: { required: "value is required" },
      }),
    ]
  );
  t.ok(set);
  t.end();
});
