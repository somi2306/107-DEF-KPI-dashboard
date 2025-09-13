
import { useSignIn, useSignUp, useClerk } from "@clerk/clerk-react";
import { Button } from "../../components/ui/button";
import { useState } from "react";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter"; // Import PasswordStrengthMeter
import AuthImagePattern from "../../components/AuthImagePattern"; // Import AuthImagePattern

const AuthPage = () => {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isSignInLoaded || !isSignUpLoaded) return null;

  const signInWithOAuth = (strategy: "oauth_google" /*| "oauth_apple"*/) => {
    signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/auth-callback",
    });
  };

  const handleEmailSignIn = async () => {
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/auth-callback";
      }
    } catch (err: any) {
      console.error("Erreur de connexion:", err);
      setError(err.errors?.[0]?.longMessage || "Une erreur s'est produite lors de la connexion.");
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Erreur d'inscription:", err);
      setError(err.errors?.[0]?.longMessage || "Une erreur s'est produite lors de l'inscription.");
    }
  };

  const handleVerification = async () => {
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        window.location.href = "/auth-callback";
      }
    } catch (err: any) {
      console.error("Erreur de vérification:", err);
      setError(err.errors?.[0]?.longMessage || "Code de vérification invalide.");
    }
  };

  return (
    // Outer container for the two-column layout on large screens, adjusted width
    <div className="max-w-4xl w-full mx-auto bg-zinc-900 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row relative z-10">
      {/* Clerk CAPTCHA container for Smart CAPTCHA */}
      <div id="clerk-captcha"></div>
      {/* Clerk CAPTCHA container for Smart CAPTCHA */}
      {/* Left Side - Form Content */}
      <div className="p-8 flex-1">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Bienvenue</h1>

        {pendingVerification ? (
          <>
            <p className="text-zinc-400 text-center mb-4">
              Un code de vérification a été envoyé à {email}.
            </p>
            <Input
              type="text"
              placeholder="Code de vérification"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mb-4"
            />
            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
            <Button
              onClick={handleVerification}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black mb-4"
            >
              Vérifier
            </Button>
            <Button
              onClick={() => setPendingVerification(false)}
              variant="outline"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
            >
              Retour
            </Button>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
              <TabsTrigger value="login" className="text-white">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="text-white">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4 mt-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button
                  onClick={handleEmailSignIn}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  Se connecter avec Email
                </Button>
              </div>
            </TabsContent>

<TabsContent value="signup">
  <div className="space-y-4 mt-4">
    {/* First + Last name côte à côte */}
    <div className="flex gap-4">
      <Input
        type="text"
        placeholder="Prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white flex-1"
      />
      <Input
        type="text"
        placeholder="Nom"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white flex-1"
      />
    </div>

    {/* Email */}
    <Input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="bg-zinc-800 border-zinc-700 text-white"
    />

    {/* Password */}
    <Input
      type="password"
      placeholder="Mot de passe"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="bg-zinc-800 border-zinc-700 text-white"
    />

    {/* Error message */}
    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

    {/* Password strength */}
    <PasswordStrengthMeter password={password} />

    {/* Button */}
    <Button
      onClick={handleSignUp}
      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black"
    >
      S'inscrire
    </Button>
  </div>
</TabsContent>

          </Tabs>
        )}

        {!pendingVerification && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-400">Ou continuer avec</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => signInWithOAuth("oauth_google")}
                variant="secondary"
                className="w-full text-black border-zinc-200 h-11"
              >
                <img src="/google.png" alt="Google" className="size-5 mr-2" />
                Continuer avec Google
              </Button>
              {/* 
              
              <Button
                onClick={() => signInWithOAuth("oauth_apple")}
                variant="secondary"
                className="w-full text-black border-zinc-200 h-11"
              >
                <img src="/apple.png" alt="Apple" className="size-5 mr-2" />
                Continuer avec Apple
              </Button>
              */}
            </div>
          </>
        )}
      </div>

      {/* Right Side - Auth Image Pattern */}
      <div className="flex-1 hidden lg:block"> {/* This div will take up space and show the image on large screens */}
        <AuthImagePattern
          title="Welcome to customized fertilizers direction" // Customize this title
          subtitle="" // Customize this subtitle
        />
      </div>
    </div>
  );
};

export default AuthPage;