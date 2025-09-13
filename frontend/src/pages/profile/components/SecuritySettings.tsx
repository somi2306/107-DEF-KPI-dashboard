
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

// Define a type for the session data you expect from your backend
interface BackendSession {
  id: string;
  userId: string;
  status: string; // e.g., 'active', 'removed'
  last_active_at: number; // Corrected: Based on the Postman result, it's a number (timestamp)
  latest_activity?: { // Properties directly from Clerk's Session.latest_activity
    browser_name?: string;
    browser_version?: string; // Add this line
    device_type?: string; // e.g., 'Windows'
    is_mobile?: boolean;
    ip_address?: string;
    city?: string;
    country?: string;
  };
  // Other properties like expire_at, created_at, updated_at are also present
}

// Helper function to format last active time
const formatLastActive = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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

  // Function to fetch active sessions from our backend
  const fetchActiveDevices = useCallback(async () => {
    if (!user?.id) {
      setIsSessionsLoading(false);
      return;
    }
    setIsSessionsLoading(true);
    setSessionsFetchError(null);
    try {
  const response = await apiClient.get<BackendSession[]>("/users/sessions");
      // Filter out 'removed' sessions if you only want active ones
      setActiveDevices(response.data.filter(session => session.status === 'active')); 
    } catch (error: any) {
      console.error("Error fetching sessions from backend:", error);
      setSessionsFetchError("Failed to load active devices.");
      toast.error("Failed to load active devices.");
    } finally {
      setIsSessionsLoading(false);
    }
  }, [user?.id]);

  // Effect to fetch sessions on component mount or user change
  useEffect(() => {
    if (isUserLoaded && user?.id) {
      fetchActiveDevices();
    }
  }, [isUserLoaded, user?.id, fetchActiveDevices]);

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setShowClerkVerificationPrompt(false);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length === 0) {
      setPasswordError("New password cannot be empty.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!user) {
        toast.error("User not loaded.");
        return;
      }

      await user.updatePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      if (signOutOthersChecked) {
        await handleSignOutOtherDevices();
      }

      toast.success("Password updated successfully! 🎉");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSignOutOthersChecked(false);
      fetchActiveDevices(); // Re-fetch sessions after password change
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage = isClerkAPIResponseError(error)
        ? error.errors[0]?.longMessage || "Failed to update password."
        : "Failed to update password.";

      if (errorMessage.includes("additional verification")) {
        setPasswordError("Additional verification is required to change your password.");
        setShowClerkVerificationPrompt(true);
        toast.error("Additional verification needed.");
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
      toast.error("User not loaded.");
      return;
    }
    try {
  await apiClient.delete(`/users/sessions/${sessionId}`);
      toast.success('Device signed out.');
      fetchActiveDevices(); // Re-fetch sessions after revoking
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error('Failed to sign out device.');
    }
  };

  const handleSignOutOtherDevices = async () => {
    if (!activeDevices || !currentSession?.id) {
      toast.error("Session data not available or no current session.");
      return;
    }

    let signOutCount = 0;
    for (const session of activeDevices) {
      if (session.id !== currentSession.id && session.status === 'active') { // Only revoke active sessions
        try {
          await apiClient.delete(`/users/sessions/${session.id}`);
          signOutCount++;
        } catch (error) {
          console.error("Failed to revoke session:", session.id, error);
          toast.error(`Failed to sign out of a device.`);
        }
      }
    }
    if (signOutCount > 0) {
      toast.success(`Signed out of ${signOutCount} other device(s).`);
      fetchActiveDevices(); // Re-fetch sessions after revoking all
    } else {
      toast("No other devices to sign out from.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error("User not loaded.");
      return;
    }
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await user.delete();
        toast.success("Account deleted successfully.");
        window.location.href = "/";
      } catch (error: any) {
        console.error("Error deleting account:", error);
        const errorMessage = isClerkAPIResponseError(error)
          ? error.errors[0]?.longMessage || "Failed to delete account."
          : "Failed to delete account.";
        toast.error(errorMessage);
      }
    }
  };

  if (!isUserLoaded || !isCurrentSessionLoaded || isSessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-zinc-400">Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Section */}
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

      {/* Active Devices */}
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

        {/* Delete account button */}
        <div className="pt-6 border-t border-slate-200 mt-6">
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