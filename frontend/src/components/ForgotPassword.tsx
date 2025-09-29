import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 1. Importer les icônes

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword = ({ onBack }: ForgotPasswordProps) => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // 2. Nouvel état pour la visibilité
  const navigate = useNavigate();

  if (!isLoaded) return null;

  const handleRequestCode = async () => {
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccessfulCreation(true);
      setError(null);
    } catch (err: any) {
      console.error("Erreur lors de la demande de code:", err);
      setError(err.errors?.[0]?.longMessage || "Une erreur s'est produite.");
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/auth-callback");
      }
    } catch (err: any) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", err);
      setError(err.errors?.[0]?.longMessage || "Code de vérification ou mot de passe invalide.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-zinc-900 rounded-lg shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Mot de passe oublié</h2>
      {!successfulCreation ? (
        <>
          <p className="text-zinc-400 text-center">
            Entrez votre adresse e-mail pour recevoir un code de réinitialisation.
          </p>
          <Input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button
            onClick={handleRequestCode}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black"
          >
            Envoyer le code
          </Button>
        </>
      ) : (
        <>
          <p className="text-zinc-400 text-center">
            Un code a été envoyé à {email}. Entrez le code et votre nouveau mot de passe.
          </p>
          <Input
            type="text"
            placeholder="Code de vérification"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          {/* 3. Ajouter l'icône au champ du mot de passe */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button
            onClick={handleResetPassword}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black"
          >
            Réinitialiser le mot de passe
          </Button>
        </>
      )}
      <Button
        onClick={onBack}
        variant="outline"
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
      >
        Retour à la connexion
      </Button>
    </div>
  );
};

export default ForgotPassword;