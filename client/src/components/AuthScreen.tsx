import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AuthScreen() {
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleTelegramAuth = async () => {
    setIsAuthenticating(true);
    try {
      // Simulate Telegram WebApp authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock Telegram user data
      const mockTelegramUser = {
        telegramId: "123456789",
        username: "johndoe",
        firstName: "John",
        lastName: "Doe"
      };

      await login(mockTelegramUser);
      
      toast({
        title: "Authentication successful",
        description: "Welcome to TonVera!",
      });
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-ton-blue to-ton-teal text-white animate-fade-in"
      data-testid="auth-screen"
    >
      {/* TON Logo */}
      <div className="mb-8 animate-bounce-gentle" data-testid="ton-logo">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
          <span className="text-3xl font-bold text-ton-blue">₿</span>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center" data-testid="app-title">
        TonVera
      </h1>
      <p className="text-lg opacity-90 text-center mb-8" data-testid="app-description">
        Premium TON staking with automated rewards and referral system
      </p>
      
      <div className="w-full space-y-4">
        <Button
          onClick={handleTelegramAuth}
          disabled={isAuthenticating || isLoading}
          className="w-full bg-white text-ton-blue font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-3"
          data-testid="button-telegram-auth"
        >
          <span className="text-xl">📱</span>
          {isAuthenticating ? "Authenticating..." : "Login with Telegram"}
        </Button>
        
        <div className="flex items-center gap-4 opacity-75">
          <div className="flex-1 h-px bg-white"></div>
          <span className="text-sm">Secure & Fast</span>
          <div className="flex-1 h-px bg-white"></div>
        </div>
      </div>
    </div>
  );
}
