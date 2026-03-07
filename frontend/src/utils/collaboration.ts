import type { Collaboration, CollaborationFile } from "../types/collaboration";

type CollaborationMediaSource = Pick<Collaboration, "thumbnailUrl" | "files">;

export function isImageMimeType(type: string | null | undefined): boolean {
  return typeof type === "string" && type.startsWith("image/");
}

export function isCollaborationImageFile(
  file: CollaborationFile | null | undefined,
): file is CollaborationFile {
  return isImageMimeType(file?.type);
}

export function getCollaborationImageFiles(
  files: CollaborationFile[] | null | undefined,
): CollaborationFile[] {
  if (!Array.isArray(files)) return [];
  return files.filter(isCollaborationImageFile);
}

export function getCollaborationCoverImageUrl(
  collab: CollaborationMediaSource | null | undefined,
): string | null {
  const thumbnailUrl =
    typeof collab?.thumbnailUrl === "string" ? collab.thumbnailUrl.trim() : "";
  if (thumbnailUrl) return thumbnailUrl;
  return getCollaborationImageFiles(collab?.files)[0]?.url ?? null;
}
