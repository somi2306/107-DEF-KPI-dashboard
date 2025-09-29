import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { apiClient } from "@/lib/axios";
import toast from "react-hot-toast";
import { isClerkAPIResponseError } from "@clerk/shared";
import { Checkbox } from "@/components/ui/checkbox"; 

const ProfileDetails = () => {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [emailAddresses, setEmailAddresses] = useState<{ id: string; email: string; isPrimary: boolean; verification: any }[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<{ id: string; provider: string; email: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addEmailDialogOpen, setAddEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [currentVerificationEmailId, setCurrentVerificationEmailId] = useState<string | null>(null);
  const [setPrimaryChecked, setSetPrimaryChecked] = useState(false);
  const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setImageUrl(user.imageUrl);

      const mappedEmails = user.emailAddresses.map((email) => ({
        id: email.id,
        email: email.emailAddress,
        isPrimary: email.id === user.primaryEmailAddressId,
        verification: email.verification,
      }));
      setEmailAddresses(mappedEmails);

      const mappedConnectedAccounts = user.externalAccounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.emailAddress,
      }));
      setConnectedAccounts(mappedConnectedAccounts);
    }
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-zinc-400">Chargement des détails du profil...</p>
      </div>
    );
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (user) {
        await user.setProfileImage({ file });
        setImageUrl(user.imageUrl);
        toast.success("Image de profil mise à jour ! 🎉");

        await apiClient.put("/users/profile", {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });

      } else {
        toast.error("Utilisateur non chargé pour mettre à jour l'image de profil.");
      }
    } catch (clerkErr: any) {
      console.error("Erreur lors du téléchargement de l'image :", clerkErr);
      const errorMessage = isClerkAPIResponseError(clerkErr)
        ? clerkErr.errors[0]?.longMessage || "Échec du téléchargement de l'image."
        : "Échec du téléchargement de l'image.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user) {
      toast.error("Utilisateur non chargé.");
      return;
    }
    setIsSaving(true);
    try {
      await user.setProfileImage({ file: null });
      setImageUrl(user.imageUrl);

      await apiClient.put("/users/profile", {
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      });

      toast.success("Image de profil supprimée !");
    } catch (error: any) {
      console.error("Erreur lors de la suppression de l'image :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la suppression de l'image."
        : "Échec de la suppression de l'image.";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      await user.update({
        firstName,
        lastName,
      });

      await apiClient.put("/users/profile", {
        firstName,
        lastName,
        imageUrl: user.imageUrl,
      });

      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du profil :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la mise à jour du profil via Clerk."
        : "Échec de la mise à jour du profil.";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;

    setShowEmailVerificationPrompt(false); 

    try {
      const newEmailObject = await user.createEmailAddress({ email: newEmail });
      if (newEmailObject) {
        await newEmailObject.prepareVerification({ strategy: "email_code" });
        setCurrentVerificationEmailId(newEmailObject.id);
        setIsVerifyingEmail(true); 
        setNewEmail(""); 
        toast.success("Code de vérification envoyé à votre nouvel email.");
      }
    } catch (error: any) {
      console.error("Erreur lors de l'ajout de l'email :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de l'ajout de l'adresse email."
        : "Échec de l'ajout de l'adresse email.";
      toast.error(errorMessage);
      if (errorMessage.includes("additional verification")) {
        setShowEmailVerificationPrompt(true);
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!currentVerificationEmailId || !verificationCode) return;

    try {
      const emailToVerify = user.emailAddresses.find(e => e.id === currentVerificationEmailId);

      if (emailToVerify) {
        const verifiedEmail = await emailToVerify.attemptVerification({ code: verificationCode });

        if (verifiedEmail) {
          if (setPrimaryChecked) {
            await user.update({ primaryEmailAddressId: verifiedEmail.id });
            toast.success("Email défini comme principal.");
          }

          await user.reload(); 
          setEmailAddresses(user.emailAddresses.map(email => ({
            id: email.id,
            email: email.emailAddress,
            isPrimary: email.id === user.primaryEmailAddressId,
            verification: email.verification,
          })));

          setAddEmailDialogOpen(false); 
          setNewEmail(""); 
          setVerificationCode("");
          setIsVerifyingEmail(false);
          setCurrentVerificationEmailId(null); 
          setSetPrimaryChecked(false); 
          toast.success("Email vérifié et ajouté ! 🎉");
        }
      } else {
        toast.error("L'email à vérifier n'a pas été trouvé.");
      }
    } catch (error: any) {
      console.error("Erreur lors de la vérification de l'email :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la vérification de l'email."
        : "Échec de la vérification de l'email.";
      toast.error(errorMessage);
    }
  };

  const handleSetPrimaryEmail = async (emailId: string) => {
    try {
      await user.update({ primaryEmailAddressId: emailId });
      await user.reload();
      setEmailAddresses(user.emailAddresses.map(email => ({
        id: email.id,
        email: email.emailAddress,
        isPrimary: email.id === user.primaryEmailAddressId,
        verification: email.verification,
      })));
      toast.success("Email principal mis à jour.");
    } catch (error: any) {
      console.error("Erreur lors de la définition de l'email principal :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la définition de l'email principal."
        : "Échec de la définition de l'email principal.";
      toast.error(errorMessage);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      const emailToDelete = user.emailAddresses.find(e => e.id === emailId);
      if (emailToDelete) {
        await emailToDelete.destroy();
        await user.reload();
        setEmailAddresses(user.emailAddresses.map(email => ({
          id: email.id,
          email: email.emailAddress,
          isPrimary: email.id === user.primaryEmailAddressId,
          verification: email.verification,
        })));
        toast.success("Adresse email supprimée.");
      } else {
        toast.error("L'email à supprimer n'a pas été trouvé.");
      }
    } catch (error: any) {
      console.error("Erreur lors de la suppression de l'email :", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la suppression de l'adresse email."
        : "Échec de la suppression de l'adresse email.";
      toast.error(errorMessage);
    }
  };

  const handleConnectGoogle = () => {
    user.createExternalAccount({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Profil */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800">Profil</h3>
        <div className="flex items-center gap-4">
          <Avatar className="w-24 h-24">
            <AvatarImage src={imageUrl} alt={user.fullName || "Avatar utilisateur"} />
            <AvatarFallback className="bg-slate-200 text-slate-800">
              {user.fullName ? user.fullName[0] : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="upload-image" className="cursor-pointer text-emerald-600 hover:underline">
              {isUploading ? "Téléchargement..." : "Télécharger une image"}
              <Input
                id="upload-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading || isSaving}
              />
            </Label>
            {user.hasImage && (
              <Button
                variant="link"
                className="text-red-600 hover:underline ml-4"
                onClick={handleRemoveImage}
                disabled={isSaving}
              >
                Supprimer
              </Button>
            )}
            <p className="text-sm text-slate-500 mt-1">Taille recommandée 1:1, jusqu'à 10MB</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first-name" className="text-slate-700">Prénom</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 bg-white border-slate-300 text-slate-800"
            />
          </div>
          <div>
            <Label htmlFor="last-name" className="text-slate-700">Nom</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 bg-white border-slate-300 text-slate-800"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100" onClick={() => {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setImageUrl(user.imageUrl);
          }} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Section Emails */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800">Adresses email</h3>
        {emailAddresses.map((email) => (
          <div key={email.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200">
            <span className="text-slate-800">{email.email}</span>
            <div className="flex items-center gap-2">
              {email.isPrimary && <span className="text-xs text-green-600 px-2 py-1 rounded-full bg-green-100">Principal</span>}
              {email.verification.status !== "verified" && (
                <span className="text-xs text-orange-600 px-2 py-1 rounded-full bg-orange-100">Non vérifié</span>
              )}
              {!email.isPrimary && (
                <Button variant="ghost" size="sm" onClick={() => handleSetPrimaryEmail(email.id)} className="text-slate-700">
                  Définir comme principal
                </Button>
              )}
              
              {email.verification.status !== "verified" && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setCurrentVerificationEmailId(email.id);
                  setNewEmail(email.email);
                  setIsVerifyingEmail(true);
                  setAddEmailDialogOpen(true);
                }} className="text-slate-700">
                  Vérifier
                </Button>
              )}
              {!email.isPrimary && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-500" onClick={() => handleDeleteEmail(email.id)} disabled={email.isPrimary}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button onClick={() => { setAddEmailDialogOpen(true); setShowEmailVerificationPrompt(false); setIsVerifyingEmail(false); }} variant="outline" className="w-full bg-white border-slate-300 text-slate-800 hover:bg-slate-100" disabled={isSaving}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une adresse email
        </Button>
      </div>

      <Dialog open={addEmailDialogOpen} onOpenChange={(open) => { setAddEmailDialogOpen(open); if (!open) { setIsVerifyingEmail(false); setNewEmail(""); setVerificationCode(""); setSetPrimaryChecked(false); setShowEmailVerificationPrompt(false); } }}>
        <DialogContent className="bg-white border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-slate-800">{isVerifyingEmail ? "Vérifier le nouvel email" : "Ajouter une nouvelle adresse email"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!isVerifyingEmail ? (
              <>
                <Label htmlFor="new-email" className="text-slate-700">Adresse email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="nouveau.email@exemple.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-white border-slate-300 text-slate-800"
                />
                {showEmailVerificationPrompt && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md text-sm mt-2">
                    <p className="mb-2">Pour des raisons de sécurité, une étape de vérification supplémentaire est requise pour ajouter cet email. Veuillez procéder via l'interface de Clerk si ce problème persiste.</p>
                    <Button
                      variant="outline"
                      className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => { openUserProfile(); setAddEmailDialogOpen(false); }}
                    >
                      Ouvrir le profil Clerk
                    </Button>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="set-primary"
                    checked={setPrimaryChecked}
                    onCheckedChange={(checked) => setSetPrimaryChecked(Boolean(checked))}
                    className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor="set-primary" className="text-sm text-slate-700 cursor-pointer">
                    Définir comme principal
                  </Label>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 text-center">
                  Un code de vérification a été envoyé à <span className="font-medium text-slate-800">{newEmail}</span>.
                </p>
                <Label htmlFor="verification-code" className="text-slate-700">Code de vérification</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Entrez le code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-white border-slate-300 text-slate-800"
                />
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100" disabled={isSaving}>
                Annuler
              </Button>
            </DialogClose>
            {!isVerifyingEmail ? (
              <Button onClick={handleAddEmail} disabled={!newEmail || isSaving}>
                Ajouter l'email
              </Button>
            ) : (
              <Button onClick={handleVerifyEmail} disabled={!verificationCode || isSaving}>
                Vérifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Comptes connectés */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800">Comptes connectés</h3>
        {connectedAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200">
            <span className="text-slate-800 capitalize">{account.provider}</span>
            <span className="text-slate-600">{account.email}</span>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-4">
          <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-800 hover:bg-slate-100" onClick={handleConnectGoogle} disabled={isSaving}>
            <img src="/google.png" alt="Google" className="size-5 mr-2" />
            Connecter Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetails;