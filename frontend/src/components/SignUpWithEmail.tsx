
import { useSignUp } from "@clerk/clerk-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SignUpWithEmail = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(""); 
  const [lastName, setLastName] = useState("");   
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isLoaded) return null;

  const handleSignUp = async () => {
    setError(null);
    try {
      await signUp.create({
        emailAddress,
        password,
        firstName, 
        lastName,  
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Erreur d'inscription par email:", err);
      const clerkErrorMessage = err.errors?.[0]?.longMessage || "Une erreur inattendue s'est produite lors de l'inscription.";
      setError(clerkErrorMessage);
    }
  };

  const handleVerification = async () => {
    setError(null);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        navigate("/auth-callback");
      } else {
        console.error("Erreur de vérification:", completeSignUp);
        setError("Code de vérification invalide. Veuillez réessayer.");
      }
    } catch (err: any) {
      console.error("Erreur de vérification:", err);
      const clerkErrorMessage = err.errors?.[0]?.longMessage || "Une erreur inattendue s'est produite lors de la vérification.";
      setError(clerkErrorMessage);
    }
  };

  return (
    <div className='max-w-md mx-auto mt-10 p-6 bg-zinc-900 rounded-lg shadow-lg space-y-4'>
      <h2 className='text-xl font-bold text-white text-center'>
        {pendingVerification ? "Vérifiez votre e-mail" : "Créer un compte"}
      </h2>

      {!pendingVerification ? (
        <>
          <Input
            type='text' 
            placeholder='Prénom' 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className='bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
          />
          <Input
            type='text' 
            placeholder='Nom' 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className='bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
          />
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
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button onClick={handleSignUp} className='w-full bg-emerald-500 hover:bg-emerald-600 text-black'>
            S'inscrire
          </Button>
          <p className="text-center text-sm text-zinc-400">
            Vous avez déjà un compte ?{" "}
            <span
              onClick={() => navigate("/sign-in-email")}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Connectez-vous
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="text-zinc-400 text-center">
            Un code de vérification a été envoyé à {emailAddress}.
          </p>
          <Input
            type='text'
            placeholder='Code de vérification'
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className='bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button onClick={handleVerification} className='w-full bg-emerald-500 hover:bg-emerald-600 text-black'>
            Vérifier
          </Button>
        </>
      )}
      <Button onClick={() => navigate(-1)} variant="outline" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
        Retour
      </Button>
    </div>
  );
};

export default SignUpWithEmail;