// src/app/pages/auth-callback/AuthCallbackPage.tsx
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/axios";
import { useUser } from "@clerk/clerk-react";
import { Loader } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallbackPage = () => {
	const { isLoaded, user } = useUser();
	const navigate = useNavigate();
	const syncAttempted = useRef(false);

	useEffect(() => {
		const syncUser = async () => {
			if (!isLoaded || !user || syncAttempted.current) return;

			try {
				syncAttempted.current = true;

			await apiClient.post("/auth/callback", {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					imageUrl: user.imageUrl,
				});
			} catch (error) {
				console.log("Error in auth callback", error);
			} finally {
				// CHANGE THIS LINE: Redirect to the actual HomePage
				navigate("/hierarchical-data"); 
			}
		};

		syncUser();
	}, [isLoaded, user, navigate]);

	return (
		<div className='h-screen w-full bg-white flex items-center justify-center'>
			<Card className='w-[90%] max-w-md bg-zinc-900 border-zinc-800'>
				<CardContent className='flex flex-col items-center gap-4 pt-6'>
					<Loader className='size-6 text-emerald-500 animate-spin' />
					<h3 className="text-zinc-400 text-xl font-bold">Connexion en cours</h3>
					<p className="text-zinc-400 text-sm">Redirection...</p>
				</CardContent>
			</Card>
		</div>
	);
};
export default AuthCallbackPage;