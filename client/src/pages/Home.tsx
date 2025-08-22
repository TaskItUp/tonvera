import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import AuthScreen from "@/components/AuthScreen";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import Dashboard from "@/components/Dashboard";
import Activity from "@/components/Activity";
import Referrals from "@/components/Referrals";
import SettingsModal from "@/components/SettingsModal";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Apply theme class to document element
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white dark:bg-ton-dark shadow-xl">
      <Header onShowSettings={() => setShowSettings(true)} user={user} />

      <div className="flex-1 overflow-hidden pb-24">
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'activity' && <Activity />}
        {currentTab === 'referrals' && <Referrals />}
      </div>
      
      <TabNavigation 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
      />

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
        />
      )}

      <LoadingOverlay />
    </div>
  );
}
