import { create } from "zustand";
import { apiClient } from "@/lib/axios";

interface AuthStore {
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;
    checkAdminStatus: (clerkId: string) => Promise<void>; 
    reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    isAdmin: false,
    isLoading: true,
    error: null,

    checkAdminStatus: async (clerkId: string) => { 
        set({ isLoading: true, error: null });
        try {
            const response = await apiClient.post("/admin/check", { clerkId });
            set({ isAdmin: response.data.admin });
        } catch (error: any) {
            set({ isAdmin: false, error: error.response?.data?.message || "Une erreur est survenue" });
        } finally {
            set({ isLoading: false });
        }
    },

    reset: () => {
        set({ isAdmin: false, isLoading: false, error: null });
    },
}));