import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import toast from "react-hot-toast";
import { useUser, useClerk, useSession } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/axios";

interface BackendSession {
  id: string;
  userId: string;
  status: string; 
  last_active_at: number; 
  latest_activity?: { 
    browser_name?: string;
    browser_version?: string; 
    device_type?: string; 
    is_mobile?: boolean;
    ip_address?: string;
    city?: string;
    country?: string;
  };
}

const formatLastActive = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const SecuritySettings = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { session: currentSession, isLoaded: isCurrentSessionLoaded } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showClerkVerificationPrompt, setShowClerkVerificationPrompt] = useState(false);
  const [signOutOthersChecked, setSignOutOthersChecked] = useState(false);

  const [activeDevices, setActiveDevices] = useState<BackendSession[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [sessionsFetchError, setSessionsFetchError] = useState<string | null>(null);

  const fetchActiveDevices = useCallback(async () => {
    if (!user?.id) {
      setIsSessionsLoading(false);
      return;
    }
    setIsSessionsLoading(true);
    setSessionsFetchError(null);
    try {
      const response = await apiClient.get<BackendSession[]>("/users/sessions");
      setActiveDevices(response.data.filter(session => session.status === 'active')); 
    } catch (error: any) {
      console.error("Erreur lors du chargement des sessions depuis le backend:", error);
      setSessionsFetchError("Échec du chargement des appareils actifs.");
      toast.error("Échec du chargement des appareils actifs.");
    } finally {
      setIsSessionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isUserLoaded && user?.id) {
      fetchActiveDevices();
    }
  }, [isUserLoaded, user?.id, fetchActiveDevices]);

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setShowClerkVerificationPrompt(false);

    if (!currentPassword) {
      setPasswordError("Le mot de passe actuel est requis.");
      return;
    }
    if (newPassword.length === 0) {
      setPasswordError("Le nouveau mot de passe ne peut pas être vide.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!user) {
        toast.error("Utilisateur non chargé.");
        return;
      }

      await user.updatePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      if (signOutOthersChecked) {
        await handleSignOutOtherDevices();
      }

      toast.success("Mot de passe mis à jour avec succès ! 🎉");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSignOutOthersChecked(false);
      fetchActiveDevices(); 
    } catch (error: any) {
      console.error("Erreur lors du changement de mot de passe:", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Échec de la mise à jour du mot de passe."
        : "Échec de la mise à jour du mot de passe.";

      if (errorMessage.includes("additional verification")) {
        setPasswordError("Une vérification supplémentaire est requise pour changer votre mot de passe.");
        setShowClerkVerificationPrompt(true);
        toast.error("Vérification supplémentaire nécessaire.");
      } else {
        setPasswordError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutSpecificDevice = async (sessionId: string) => {
    if (!user) {
      toast.error("Utilisateur non chargé.");
      return;
    }
    try {
      await apiClient.delete(`/users/sessions/${sessionId}`);
      toast.success('Appareil déconnecté.');
      fetchActiveDevices(); 
    } catch (error) {
      console.error("Erreur lors de la révocation de la session:", error);
      toast.error('Échec de la déconnexion de l\'appareil.');
    }
  };

  const handleSignOutOtherDevices = async () => {
    if (!activeDevices || !currentSession?.id) {
      toast.error("Données de session non disponibles ou session actuelle manquante.");
      return;
    }

    let signOutCount = 0;
    for (const session of activeDevices) {
      if (session.id !== currentSession.id && session.status === 'active') { 
        try {
          await apiClient.delete(`/users/sessions/${session.id}`);
          signOutCount++;
        } catch (error) {
          console.error("Échec de la révocation de la session:", session.id, error);
          toast.error(`Échec de la déconnexion d'un appareil.`);
        }
      }
    }
    if (signOutCount > 0) {
      toast.success(`Déconnecté de ${signOutCount} autre(s) appareil(s).`);
      fetchActiveDevices(); 
    } else {
      toast("Aucun autre appareil à déconnecter.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error("Utilisateur non chargé.");
      return;
    }
    if (window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      try {
        await user.delete();
        toast.success("Compte supprimé avec succès.");
        window.location.href = "/";
      } catch (error: any) {
        console.error("Erreur lors de la suppression du compte:", error);
        const errorMessage = isClerkAPIResponseError(error)
          ? error.errors[0]?.longMessage || "Échec de la suppression du compte."
          : "Échec de la suppression du compte.";
        toast.error(errorMessage);
      }
    }
  };

  if (!isUserLoaded || !isCurrentSessionLoaded || isSessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-zinc-400">Chargement des paramètres de sécurité...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Mise à jour du mot de passe */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800">Mettre à jour le mot de passe</h3>
        <div>
          <Label htmlFor="current-password" className="text-slate-700">Mot de passe actuel</Label>
          <Input
            id="current-password"
            type="password"
            placeholder="Entrez le mot de passe actuel"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 bg-white border-slate-300 text-slate-800"
          />
        </div>
        <div>
          <Label htmlFor="new-password" className="text-slate-700">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="Entrez le nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 bg-white border-slate-300 text-slate-800"
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="text-slate-700">Confirmer le nouveau mot de passe</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirmez le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 bg-white border-slate-300 text-slate-800"
          />
        </div>
        {newPassword && <PasswordStrengthMeter password={newPassword} />}
        {passwordError && <p className="text-red-600 text-sm mt-2">{passwordError}</p>}

        {showClerkVerificationPrompt && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md text-sm mt-2">
            <p className="mb-2">Pour des raisons de sécurité, une étape de vérification supplémentaire est requise. Veuillez gérer votre mot de passe via l'interface complète de Clerk.</p>
            <Button
              variant="outline"
              className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => openUserProfile()}
            >
              Ouvrir le profil Clerk
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="sign-out-others"
            checked={signOutOthersChecked}
            onCheckedChange={(checked) => setSignOutOthersChecked(Boolean(checked))}
            className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
          />
          <Label htmlFor="sign-out-others" className="text-sm text-slate-700 cursor-pointer">
            Se déconnecter de tous les autres appareils
          </Label>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100" onClick={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError(null);
            setShowClerkVerificationPrompt(false);
            setSignOutOthersChecked(false);
          }} disabled={isChangingPassword}>
            Annuler
          </Button>
          <Button onClick={handlePasswordChange} disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
            {isChangingPassword ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Section Appareils actifs */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800">Appareils actifs</h3>
        <p className="text-slate-600">Gérez les appareils actuellement connectés à votre compte.</p>

        {sessionsFetchError && (
          <p className="text-red-600 text-sm">{sessionsFetchError}</p>
        )}

        <div className="space-y-3">
          {activeDevices && activeDevices.length > 0 ? (
            activeDevices.map((session) => {
              const isCurrentDevice = currentSession && session.id === currentSession.id;
              
              const osName = session.latest_activity?.device_type || 'OS inconnu';
              const browserName = session.latest_activity?.browser_name || 'Navigateur inconnu';
              const browserVersion = session.latest_activity?.browser_version ? ` ${session.latest_activity.browser_version}` : '';
              const ipAddress = session.latest_activity?.ip_address || '';

              const lastActiveTimestamp = session.last_active_at;

              return (
                <div key={session.id} className={`p-3 rounded-md border ${isCurrentDevice ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-slate-800 font-medium">
                    {osName} {isCurrentDevice ? "- Cet appareil" : ""}
                  </p>
                  <p className="text-slate-600 text-sm">
                    {browserName}{browserVersion} {ipAddress && `(IP: ${ipAddress})`}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {lastActiveTimestamp ? `Dernière activité: ${formatLastActive(lastActiveTimestamp)}` : 'Heure de dernière activité inconnue'}
                  </p>
                  {!isCurrentDevice && (session.status === 'active') && (
                    <div className="mt-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleSignOutSpecificDevice(session.id)}
                      >
                        Se déconnecter
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-slate-600 text-sm">Aucune session active trouvée.</p>
          )}
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
            onClick={handleSignOutOtherDevices}
          >
            Se déconnecter de tous les autres appareils
          </Button>
        </div>

        {/* Section Suppression du compte */}
        <div className="pt-6 border-t border-slate-200 mt-6 flex justify-center">
  <Button
    variant="destructive"
    className="w-full sm:w-auto"
    onClick={handleDeleteAccount}
  >
    Supprimer le compte
  </Button>
</div>

      </div>
    </div>
  );
};

export default SecuritySettings;