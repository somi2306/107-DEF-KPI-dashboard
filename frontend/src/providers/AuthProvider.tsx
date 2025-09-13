import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuth } from "@clerk/clerk-react";
import { Loader } from "lucide-react";
import { useEffect } from "react";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    // 'userId' de useAuth est le 'clerkId' dont nous avons besoin
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
            // On vérifie que l'utilisateur est connecté et que nous avons son ID
            if (isSignedIn && userId) {
                // On passe le userId (clerkId) à notre fonction
                await checkAdminStatus(userId);
            }
        };

        initAuth();

        return () => {
            apiClient.interceptors.request.eject(interceptor);
        };
    // On garde les dépendances correctes pour s'assurer que l'effet se déclenche au bon moment
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