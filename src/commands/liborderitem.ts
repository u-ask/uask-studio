import { InterviewItem, IPageBuilder, mlstring, SurveyBuilder } from "uask-dom";

export function libOrderItem(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question(
      "",
      "__ITEM_DIRECTION__",
      b.types.choice("one", "up", "down").translate("fr", "haut", "bas")
    )
    .translate("en", "Direction")
    .translate("fr", "Direction")
    .required()
    .comment("{.studio.studioApply}");
  if (section) builder.endSection();
  return builder;
}

export function getApplyItem(
  interviewItems: InterviewItem[]
): InterviewItem | undefined {
  return interviewItems.find(i => i.pageItem.variableName == "__APPLY__");
}
