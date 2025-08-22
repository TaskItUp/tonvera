import { Button } from "@/components/ui/button";
import { Gem, TrendingUp, Users } from "lucide-react";

interface TabNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabNavigation({ currentTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Pool', icon: Gem },
    { id: 'activity', label: 'Returns', icon: TrendingUp },
    { id: 'referrals', label: 'Refer', icon: Users }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between px-2 py-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                variant="ghost"
                className={`relative flex flex-col items-center gap-2 py-6 px-6 font-medium transition-all duration-200 flex-1 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400" />
                )}
                <IconComponent 
                  size={24} 
                  className="transition-all duration-200" 
                />
                <span className="text-sm font-medium mb-2">
                  {tab.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
