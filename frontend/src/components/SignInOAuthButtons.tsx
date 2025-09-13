// SignInOAuthButtons.tsx
import { useSignIn } from "@clerk/clerk-react";
import { Button } from "./ui/button";

const SignInOAuthButtons = () => {
  const { signIn, isLoaded } = useSignIn();

  if (!isLoaded) return null;

  const signInWithGoogle = () => {
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/auth-callback",
    });
  };
/*
  const signInWithApple = () => {
    signIn.authenticateWithRedirect({
      strategy: "oauth_apple",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/auth-callback",
    });
  };
*/
  const redirectToEmailPage = () => {
    window.location.href = "/sign-in-email"; // Crée cette page dans ton routeur
  };

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={signInWithGoogle} variant={"secondary"} className='w-full text-white border-zinc-200 h-11'>
        <img src='/google.png' alt='Google' className='size-5 mr-2' />
        Continuer avec Google
      </Button>
      {/* 
      <Button onClick={signInWithApple} variant={"secondary"} className='w-full text-white border-zinc-200 h-11'>
        <img src='/apple.png' alt='Apple' className='size-5 mr-2' />
        Continuer avec Apple
      </Button>
      */}
      <Button onClick={redirectToEmailPage} variant={"secondary"} className='w-full text-white border-zinc-200 h-11'>
        Continuer avec l'e-mail
      </Button>
    </div>
  );
};

export default SignInOAuthButtons;
