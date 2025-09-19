import { useEffect, useState } from "react";
import { ResizablePanel, ResizablePanelGroup } from "../ui/resizable";
import { Header } from "./Header";
import { Outlet, useLocation } from "react-router-dom";

type MainLayoutProps = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ activePage, setActivePage }) => {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mettre à jour activePage lorsque l'URL change
  useEffect(() => {
    setActivePage(location.pathname.substring(1)); 
  }, [location, setActivePage]);

  return (
    <div className="min-h-screen bg-emerald-50 text-black flex flex-col">
      <Header activePage={activePage} setActivePage={setActivePage} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={isMobile ? 100 : 80} minSize={60} maxSize={100}>
            <main className="h-full overflow-auto">
              <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};