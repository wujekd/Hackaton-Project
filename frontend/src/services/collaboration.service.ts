import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  orderBy,
  query,
  updateDoc,
  where,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  deleteObject,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "./firebase";
import type { Collaboration, CollaborationFile } from "../types/collaboration";
import {
  isCollaborationImageFile,
} from "../utils/collaboration";

const COLLECTION = "collaborations";

export type CollaborationCursor = QueryDocumentSnapshot<DocumentData> | null;

export interface CollaborationPage {
  items: Collaboration[];
  cursor: CollaborationCursor;
  hasMore: boolean;
}

type ThumbnailSelection =
  | { source: "existing"; url: string }
  | { source: "new"; index: number }
  | null;

function pickThumbnailUrl(
  retainedFiles: CollaborationFile[],
  uploadedFiles: CollaborationFile[],
  selection: ThumbnailSelection,
): string | null {
  if (selection?.source === "existing") {
    const selected = retainedFiles.find((file) => file.url === selection.url);
    if (selected && isCollaborationImageFile(selected)) return selected.url;
  }

  if (selection?.source === "new") {
    const selected = uploadedFiles[selection.index];
    if (selected && isCollaborationImageFile(selected)) return selected.url;
  }

  const fallback = [...retainedFiles, ...uploadedFiles].find(isCollaborationImageFile);
  return fallback?.url ?? null;
}

async function uploadFiles(files: File[]): Promise<CollaborationFile[]> {
  const uploadedFiles: CollaborationFile[] = [];

  for (const file of files) {
    const path = `collaborations/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    uploadedFiles.push({
      name: file.name,
      url,
      type: file.type,
      size: file.size,
    });
  }

  return uploadedFiles;
}

async function deleteFilesByUrl(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await Promise.allSettled(
    urls.map((url) => deleteObject(ref(storage, url))),
  );
}

export const CollaborationService = {
  async getAll(): Promise<Collaboration[]> {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Collaboration);
  },

  async getById(id: string): Promise<Collaboration | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Collaboration;
  },

  async getByAuthor(authorId: string): Promise<Collaboration[]> {
    const q = query(
      collection(db, COLLECTION),
      where("authorId", "==", authorId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Collaboration);
  },

  async listPage(pageSize = 20, cursor: CollaborationCursor = null): Promise<CollaborationPage> {
    const collabsCollection = collection(db, COLLECTION);
    const q =
      cursor ?
        query(collabsCollection, orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize)) :
        query(collabsCollection, orderBy("createdAt", "desc"), limit(pageSize));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Collaboration);
    const nextCursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : cursor;

    return {
      items,
      cursor: nextCursor,
      hasMore: snap.docs.length === pageSize,
    };
  },

  async create(
    data: {
      title: string;
      description: string;
      authorId: string;
      authorName: string;
      tags: string[];
      mediaDefaultY: number;
      mediaMinY: number;
      mediaMaxY: number;
    },
    files: File[],
    thumbnailSelection: ThumbnailSelection = null,
  ): Promise<string> {
    const uploadedFiles = await uploadFiles(files);
    const thumbnailUrl = pickThumbnailUrl([], uploadedFiles, thumbnailSelection);

    const docRef = await addDoc(collection(db, COLLECTION), {
      title: data.title,
      description: data.description,
      authorId: data.authorId,
      authorName: data.authorName,
      collaborators: [],
      tags: data.tags,
      files: uploadedFiles,
      thumbnailUrl,
      mediaDefaultY: data.mediaDefaultY,
      mediaMinY: data.mediaMinY,
      mediaMaxY: data.mediaMaxY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  },

  async update(
    id: string,
    data: {
      title: string;
      description: string;
      tags: string[];
      authorName: string;
      mediaDefaultY: number;
      mediaMinY: number;
      mediaMaxY: number;
    },
    newFiles: File[],
    retainedFiles: CollaborationFile[],
    removedFileUrls: string[] = [],
    thumbnailSelection: ThumbnailSelection = null,
  ): Promise<void> {
    const uploadedFiles = await uploadFiles(newFiles);
    const nextFiles = [...retainedFiles, ...uploadedFiles];
    const thumbnailUrl = pickThumbnailUrl(retainedFiles, uploadedFiles, thumbnailSelection);

    await updateDoc(doc(db, COLLECTION, id), {
      title: data.title,
      description: data.description,
      tags: data.tags,
      authorName: data.authorName,
      files: nextFiles,
      thumbnailUrl,
      mediaDefaultY: data.mediaDefaultY,
      mediaMinY: data.mediaMinY,
      mediaMaxY: data.mediaMaxY,
      updatedAt: serverTimestamp(),
    });

    await deleteFilesByUrl(removedFileUrls);
  },

  async delete(id: string): Promise<void> {
    const refDoc = doc(db, COLLECTION, id);
    const snap = await getDoc(refDoc);
    const filesToDelete = snap.exists() ?
      ((snap.data() as Collaboration).files ?? [])
        .map((file) => file?.url)
        .filter((url): url is string => typeof url === "string" && url.length > 0) :
      [];

    await deleteDoc(refDoc);
    await deleteFilesByUrl(filesToDelete);
  },
};
