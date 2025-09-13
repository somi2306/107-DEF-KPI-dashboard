
import { useSignIn } from "@clerk/clerk-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SignInWithEmail = () => {
  const { signIn, isLoaded, setActive } = useSignIn(); // Destructure setActive
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  if (!isLoaded) return null;

  const handleEmailSignIn = async () => {
    try {
      const result = await signIn.create({ // Capture the result of signIn.create
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") { // Check if sign-in is complete
        await setActive({ session: result.createdSessionId }); // Activate the session
        navigate("/auth-callback"); // Redirect after session is active
      } else {
        // Handle other statuses if necessary (e.g., requires 2FA)
        console.error("Connexion incomplète:", result);
        alert("La connexion nécessite des étapes supplémentaires. Veuillez vérifier la console.");
      }
    } catch (err: any) {
      console.error("Erreur de connexion par email:", err);
      alert("Échec de la connexion: " + err.errors[0]?.longMessage || "Erreur inconnue");
    }
  };

  return (
    <div className='max-w-md mx-auto mt-10 p-6 bg-zinc-900 rounded-lg shadow-lg space-y-4'>
      <h2 className='text-xl font-bold text-white text-center'>Connexion avec Email</h2>
      <Input
        type='email'
        placeholder='Adresse e-mail'
        value={emailAddress}
        onChange={(e) => setEmailAddress(e.target.value)}
        className='bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
      />
      <Input
        type='password'
        placeholder='Mot de passe'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className='bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
      />
      <Button onClick={handleEmailSignIn} className='w-full bg-emerald-500 hover:bg-emerald-600 text-black'>
        Se connecter
      </Button>
      <Button onClick={() => navigate(-1)} variant="outline" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
        Retour
      </Button>
    </div>
  );
};

export default SignInWithEmail;