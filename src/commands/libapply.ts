import { InterviewItem, IPageBuilder, mlstring, SurveyBuilder } from "uask-dom";

export function libApply(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__APPLY__", b.types.acknowledge)
    .translate("en", "Save changes?")
    .translate("fr", "Sauvegarder les modifications ?")
    .comment("{.studio.studioApply}");
  if (section) builder.endSection();
  return builder;
}

export function getApplyItem(
  interviewItems: InterviewItem[]
): InterviewItem | undefined {
  return interviewItems.find(i => i.pageItem.variableName == "__APPLY__");
}
