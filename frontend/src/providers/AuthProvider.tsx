import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuth } from "@clerk/clerk-react";
import { Loader } from "lucide-react";
import { useEffect } from "react";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { getToken, userId, isLoaded, isSignedIn } = useAuth();
    const { checkAdminStatus } = useAuthStore();

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

    const interceptor = apiClient.interceptors.request.use(async (config) => {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        const initAuth = async () => {
            if (isSignedIn && userId) {
                await checkAdminStatus(userId);
            }
        };

        initAuth();

        return () => {
            apiClient.interceptors.request.eject(interceptor);
        };
    }, [isLoaded, isSignedIn, userId, getToken, checkAdminStatus]);

    if (!isLoaded) {
        return (
            <div className='h-screen w-full flex items-center justify-center'>
                <Loader className='size-8 text-emerald-500 animate-spin' />
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthProvider;