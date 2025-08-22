import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { type User } from "@shared/schema";

interface HeaderProps {
  onShowSettings: () => void;
  user: User | null;
}

export default function Header({ onShowSettings, user }: HeaderProps) {
  const { toggleTheme } = useTheme();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName) return "U";
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName?.charAt(0).toUpperCase() || "";
    return first + last;
  };

  return (
    <header className="bg-slate-800 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"
            data-testid="avatar-user"
          >
            <span className="text-white font-bold text-sm">
              T
            </span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-white" data-testid="text-user-name">
              Tonvera
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                {parseFloat(user.totalStaked || '0').toFixed(2)} TON
              </p>
              <p className="text-xs text-gray-400">
                Balance
              </p>
            </div>
          )}
          <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">
              {user?.firstName?.[0] || user?.username?.[0] || '👤'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
