
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileDetails from "./components/ProfileDetails";
import SecuritySettings from "./components/SecuritySettings";
import { User, Shield } from "lucide-react";

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <main className='p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen'>
      <div className="mx-auto max-w-6xl">


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
            
            <Card className="bg-white pt-2 shadow-sm">
              <CardContent className="p-0">
                <TabsList className="flex flex-col h-auto p-2 bg-transparent justify-start items-start space-y-1">
                  <TabsTrigger
                    value="profile"
                    className="w-full justify-start data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
                  >
                    <User className="mr-2 h-4 w-4" /> Profil
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="w-full justify-start data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
                  >
                    <Shield className="mr-2 h-4 w-4" /> Sécurité
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <div>
             
              <TabsContent value="profile">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-800">Détails du profil</CardTitle>
                    <CardDescription>Gérez les informations de votre compte.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProfileDetails />
                  </CardContent>
                </Card>
              </TabsContent>

              
              <TabsContent value="security">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-800">Sécurité</CardTitle>
                    <CardDescription>Gérez votre mot de passe et les appareils connectés.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SecuritySettings />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
};

export default ProfilePage;