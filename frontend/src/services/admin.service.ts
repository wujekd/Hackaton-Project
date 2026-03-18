import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const AdminService = {
    deleteUser: async (identifier: string): Promise<{ deletedUid: string; note?: string }> => {
        try {
            const deleteUserFn = httpsCallable<
                { identifier: string },
                { status: string; deletedUid: string; note?: string }
            >(functions, "adminDeleteUser");

            const result = await deleteUserFn({ identifier });
            return {
                deletedUid: result.data.deletedUid,
                note: result.data.note,
            };
        } catch (error: any) {
            const message = error?.message || "An error occurred while deleting the user.";
            throw new Error(message);
        }
    },
};
