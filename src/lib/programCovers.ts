export const GROUP_PT_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/attachments/4f987a23-347c-422d-8213-a2e89eca85b6.png";

export const STRONGER_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/attachments/537d7107-ea07-4065-b402-b1421aa5f38d.png";

export const FOUNDATIONS_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/attachments/26d68c54-8cd0-49cc-8c57-8add846cdfdb.png";

export const FUSION_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/attachments/30e70910-c8f2-4dcf-9782-e1f57a34385d.png";

export const PERFORMANCE_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/attachments/1f005e60-ccc4-437f-83ce-cafa4593e109.png";

export const DEFAULT_PROGRAM_COVER_IMAGE =
  "https://vibe.filesafe.space/1783496939163756206/assets/d81fb983-0fbc-4056-ae4e-83766de15850.png";

export const getProgramCoverImage = (prog: any, cat?: string): string => {
  const isGroupPT =
    cat === "Group PT" ||
    cat === "GroupPT" ||
    prog?.type === "GroupPT" ||
    prog?.stream === "Group PT" ||
    prog?.stream === "GroupPT";

  // For all Group PT programmes, always use the dedicated Group PT image
  if (isGroupPT) {
    return GROUP_PT_COVER_IMAGE;
  }

  // If a custom cover image was set on the programme, use that
  if (prog?.coverImage) return prog.coverImage;

  const category =
    cat ||
    (prog?.type === "GroupPT" ? "Group PT" : prog?.stream || "Foundations");

  if (category === "Stronger") {
    return STRONGER_COVER_IMAGE;
  }
  if (category === "Foundations") {
    return FOUNDATIONS_COVER_IMAGE;
  }
  if (category === "Fusion") {
    return FUSION_COVER_IMAGE;
  }
  if (category === "Performance") {
    return PERFORMANCE_COVER_IMAGE;
  }

  return DEFAULT_PROGRAM_COVER_IMAGE;
};
