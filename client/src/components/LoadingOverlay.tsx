import { useState, useEffect } from "react";

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [loadingText, setLoadingText] = useState("Processing...");

  useEffect(() => {
    // Listen for custom loading events
    const handleShowLoading = (event: CustomEvent) => {
      setLoadingText(event.detail.text || "Processing...");
      setIsVisible(true);
    };

    const handleHideLoading = () => {
      setIsVisible(false);
    };

    window.addEventListener('showLoading' as any, handleShowLoading);
    window.addEventListener('hideLoading' as any, handleHideLoading);

    return () => {
      window.removeEventListener('showLoading' as any, handleShowLoading);
      window.removeEventListener('hideLoading' as any, handleHideLoading);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" data-testid="loading-overlay">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-ton-blue border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="font-medium" data-testid="text-loading">
          {loadingText}
        </p>
      </div>
    </div>
  );
}

// Helper functions to show/hide loading overlay
export const showLoading = (text: string = "Processing...") => {
  window.dispatchEvent(new CustomEvent('showLoading', { detail: { text } }));
};

export const hideLoading = () => {
  window.dispatchEvent(new CustomEvent('hideLoading'));
};
