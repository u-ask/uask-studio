import {
  CrossItemRule,
  DomainCollection,
  IDomainCollection,
  InterviewItem,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageBuilder,
  PageItem,
  Survey,
  SurveyBuilder,
  SurveyOptions,
} from "uask-dom";
import { IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { libUpdateSurveyOptions } from "./libupdatesurveyoptions.js";

export class UpdateSurveyOptionsCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  parts?: Survey;
  surveyPageIndex?: number;
  private surveyOptions?: SurveyOptions;
  private page?: Page;

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  get eproPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__EPRO__"
    ) as PageItem;
  }

  get fillratesPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__SHOW_FILLRATES__"
    ) as PageItem;
  }

  get availableLangsPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__AVAILABLE_LANGS__"
    ) as PageItem;
  }

  get defaultLangPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__DEFAULT_LANG__"
    ) as PageItem;
  }

  get participantCodeLengthPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PARTICIPANT_CODE_LENGTH__"
    ) as PageItem;
  }

  get participantCodeBySitePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PARTICIPANT_CODE_BY_SAMPLE__"
    ) as PageItem;
  }

  get interviewDatePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__INTERVIEW_DATE_VAR__"
    ) as PageItem;
  }

  get phonePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PHONE_VAR__"
    ) as PageItem;
  }

  get emailPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__EMAIL_VAR__"
    ) as PageItem;
  }

  get unitSuffixPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__UNIT_SUFFIX__"
    ) as PageItem;
  }

  get inclusionPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__INC_VAR__"
    ) as PageItem;
  }

  private buildParts(
    survey: Survey,
    section = {
      en: "Update survey options",
      fr: "Mise à jour des options de l'étude",
    } as mlstring
  ) {
    const b = new SurveyBuilder();
    libUpdateSurveyOptions(b, "updatesurveyoptions", section);
    libApply(b, "apply", section);
    this.parts = b.get();
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageSetIndex: number,
    section?: mlstring
  ): void {
    this.pageSetIndex = pageSetIndex;
    this.pageIndex = 0;
    this.surveyOptions = survey.options;

    this.buildParts(survey, section);
    this.page = this.buildOptionPage(survey);

    survey.insertPage(pageSetIndex, 0, this.page);
    this.surveyPageIndex = survey.pages.indexOf(this.page);

    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private buildOptionPage(survey: MutableSurvey) {
    const b = new SurveyBuilder();
    b.options(survey.options);
    const pageBuilder = b
      .page("Survey options")
      .translate("fr", "Options de l'étude") as PageBuilder;
    return pageBuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const languages = this.surveyOptions?.languages;
    const defaultLang = this.surveyOptions?.defaultLang;
    const epro = boolToInt(!!this.surveyOptions?.epro);
    const fillRate = boolToInt(!!this.surveyOptions?.showFillRate);

    const participantCodeLength =
      this.surveyOptions?.participantCodeStrategy?.length;
    const participantCodeBySite = boolToInt(
      !!this.surveyOptions?.participantCodeStrategy?.bySample
    );

    const interviewDateVar = this.surveyOptions?.interviewDateVar;
    const phoneVar = this.surveyOptions?.phoneVar;
    const emailVar = this.surveyOptions?.emailVar;
    const unitSuffix = this.surveyOptions?.unitSuffix;

    const inclusionPart = (
      this.surveyOptions?.inclusionVar as { name?: string; hidden?: boolean }
    )?.name;

    return DomainCollection(
      new InterviewItem(this.availableLangsPart, languages),
      new InterviewItem(this.defaultLangPart, defaultLang),
      new InterviewItem(this.eproPart, epro),
      new InterviewItem(this.fillratesPart, fillRate),
      new InterviewItem(this.participantCodeLengthPart, participantCodeLength),
      new InterviewItem(this.participantCodeBySitePart, participantCodeBySite),
      new InterviewItem(this.interviewDatePart, interviewDateVar),
      new InterviewItem(this.phonePart, phoneVar),
      new InterviewItem(this.emailPart, emailVar),
      new InterviewItem(this.unitSuffixPart, unitSuffix),
      new InterviewItem(this.inclusionPart, inclusionPart)
    );
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { updatedOptions } = this.bindPartItems(survey, interviewItems);
    survey.updateOptions(updatedOptions);
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { updatedOptions: SurveyOptions } {
    const languages = interviewItems.find(
      ii => ii.pageItem == this.availableLangsPart
    )?.value as string[];
    const defaultLang = interviewItems.find(
      ii => ii.pageItem == this.defaultLangPart
    )?.value as string;
    const visitDateVar = interviewItems.find(
      ii => ii.pageItem == this.interviewDatePart
    )?.value as string;
    const phoneVar = interviewItems.find(ii => ii.pageItem == this.phonePart)
      ?.value as string;
    const emailVar = interviewItems.find(ii => ii.pageItem == this.emailPart)
      ?.value as string;
    const showFillRate = !!interviewItems.find(
      ii => ii.pageItem == this.fillratesPart
    )?.value as boolean;
    const epro = !!interviewItems.find(ii => ii.pageItem == this.eproPart)
      ?.value as boolean;
    const inclusionVarCode = interviewItems.find(
      ii => ii.pageItem == this.inclusionPart
    )?.value as string;
    const unitSuffix = interviewItems.find(
      ii => ii.pageItem == this.unitSuffixPart
    )?.value as string;
    const participantCodeLength = interviewItems.find(
      ii => ii.pageItem == this.participantCodeLengthPart
    )?.value as number;
    const participantCodeBySite = !!interviewItems.find(
      ii => ii.pageItem == this.participantCodeBySitePart
    )?.value as boolean;

    const surveyOptions = this.buidOptions(
      languages,
      defaultLang,
      visitDateVar,
      phoneVar,
      emailVar,
      showFillRate,
      epro,
      inclusionVarCode,
      unitSuffix,
      participantCodeLength,
      participantCodeBySite
    );

    const b = new SurveyBuilder();
    b.options(surveyOptions);
    return { updatedOptions: b.get().options };
  }

  private buidOptions(
    languages: string[],
    defaultLang: string,
    visitDateVar: string,
    phoneVar: string,
    emailVar: string,
    showFillRate: boolean,
    epro: boolean,
    inclusionVarCode: string,
    unitSuffix: string,
    participantCodeLength: number,
    participantCodeBySite: boolean
  ) {
    return {
      ...(languages ? { languages } : {}),
      ...(defaultLang ? { defaultLang } : {}),
      ...(visitDateVar ? { visitDateVar } : {}),
      ...(phoneVar ? { phoneVar } : {}),
      ...(emailVar ? { emailVar } : {}),
      ...(typeof showFillRate != "undefined"
        ? { showFillRate: showFillRate }
        : {}),
      ...(typeof epro != "undefined" ? { epro: epro } : {}),
      inclusionVar: {
        name:
          inclusionVarCode ??
          (
            this.surveyOptions?.inclusionVar as {
              name?: string;
              hidden?: boolean;
            }
          )?.name,
        hidden: (
          this.surveyOptions?.inclusionVar as {
            name?: string;
            hidden?: boolean;
          }
        )?.hidden,
      },
      ...(unitSuffix ? { unitSuffix } : {}),
      participantCodeStrategy: {
        length:
          participantCodeLength ??
          this.surveyOptions?.participantCodeStrategy?.length,
        bySite:
          participantCodeBySite ??
          this.surveyOptions?.participantCodeStrategy?.bySample,
      },
    };
  }

  canApply(): boolean {
    return true;
  }
}

function boolToInt(bool: boolean) {
  return bool ? 1 : 0;
}
