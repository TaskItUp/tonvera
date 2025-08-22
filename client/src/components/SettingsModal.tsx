import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { logout } = useAuth();
  const { disconnect } = useWallet();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected successfully",
      });
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" data-testid="settings-modal">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" data-testid="text-settings-title">Settings</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            data-testid="button-close-settings"
          >
            <span className="text-xl">✕</span>
          </Button>
        </div>
        
        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg" data-testid="setting-theme">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dark/Light mode</p>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              data-testid="switch-theme"
            />
          </div>
          
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg" data-testid="setting-notifications">
            <div>
              <p className="font-medium">Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily rewards alerts</p>
            </div>
            <Switch
              checked={true}
              onCheckedChange={() => {
                toast({
                  title: "Notifications",
                  description: "Notification settings coming soon!",
                });
              }}
              data-testid="switch-notifications"
            />
          </div>
          
          {/* Auto-compound Toggle */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg" data-testid="setting-compound">
            <div>
              <p className="font-medium">Auto-compound</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically reinvest rewards</p>
            </div>
            <Switch
              checked={true}
              disabled
              data-testid="switch-compound"
            />
          </div>
          
          {/* Disconnect Wallet */}
          <Button
            onClick={handleDisconnectWallet}
            variant="outline"
            className="w-full text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/50"
            data-testid="button-disconnect-wallet"
          >
            Disconnect Wallet
          </Button>
          
          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
            data-testid="button-logout"
          >
            Logout
          </Button>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center" data-testid="text-app-version">
              TON Staking Pool v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
