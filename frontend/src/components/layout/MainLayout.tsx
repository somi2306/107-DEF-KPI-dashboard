import { Header } from './Header';

type MainLayoutProps = {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activePage, setActivePage }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
