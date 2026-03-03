import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "./firebase";
import type { Collaboration, CollaborationFile } from "../types/collaboration";

const COLLECTION = "collaborations";

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

  async create(
    data: {
      title: string;
      description: string;
      authorId: string;
      authorName: string;
      tags: string[];
    },
    files: File[],
  ): Promise<string> {
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

    const docRef = await addDoc(collection(db, COLLECTION), {
      title: data.title,
      description: data.description,
      authorId: data.authorId,
      authorName: data.authorName,
      collaborators: [],
      tags: data.tags,
      files: uploadedFiles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  },
};
