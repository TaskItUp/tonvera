export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: any;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
    hint_color?: string;
    bg_color?: string;
    text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: {
    text?: string;
  }, callback?: (text: string) => boolean | void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean) => void) => void;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    readonly isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  SettingsButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  CloudStorage: {
    setItem: (key: string, value: string, callback?: (error?: string) => void) => void;
    getItem: (key: string, callback: (error?: string, value?: string) => void) => void;
    getItems: (keys: string[], callback: (error?: string, values?: Record<string, string>) => void) => void;
    removeItem: (key: string, callback?: (error?: string) => void) => void;
    removeItems: (keys: string[], callback?: (error?: string) => void) => void;
    getKeys: (callback: (error?: string, keys?: string[]) => void) => void;
  };
  BiometricManager: {
    isInited: boolean;
    isBiometricAvailable: boolean;
    biometricType: 'finger' | 'face' | 'unknown';
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    isBiometricTokenSaved: boolean;
    deviceId: string;
    init: (callback?: () => void) => void;
    requestAccess: (params: {
      reason?: string;
    }, callback?: (granted: boolean) => void) => void;
    authenticate: (params: {
      reason?: string;
    }, callback?: (success: boolean, token?: string) => void) => void;
    updateBiometricToken: (token: string, callback?: (updated: boolean) => void) => void;
    openSettings: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Get the Telegram WebApp instance
 */
export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

/**
 * Check if running inside Telegram WebApp
 */
export const isTelegramWebApp = (): boolean => {
  return getTelegramWebApp() !== null;
};

/**
 * Initialize Telegram WebApp
 */
export const initTelegramWebApp = (): Promise<TelegramWebApp> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not running in browser environment'));
      return;
    }

    const checkTelegram = () => {
      const webapp = getTelegramWebApp();
      if (webapp) {
        webapp.ready();
        webapp.expand();
        resolve(webapp);
      } else {
        // For development/testing, create a mock WebApp
        const mockWebApp = createMockTelegramWebApp();
        resolve(mockWebApp);
      }
    };

    // Check if Telegram is already available
    if (window.Telegram?.WebApp) {
      checkTelegram();
    } else {
      // Wait for Telegram script to load
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.onload = checkTelegram;
      script.onerror = () => {
        // Fallback to mock for development
        const mockWebApp = createMockTelegramWebApp();
        resolve(mockWebApp);
      };
      document.head.appendChild(script);
    }
  });
};

/**
 * Create a mock Telegram WebApp for development/testing
 */
const createMockTelegramWebApp = (): TelegramWebApp => {
  const mockUser: TelegramUser = {
    id: 123456789,
    first_name: "John",
    last_name: "Doe",
    username: "johndoe",
    language_code: "en"
  };

  const mockInitData: TelegramWebAppInitData = {
    query_id: "mock_query_id",
    user: mockUser,
    auth_date: Math.floor(Date.now() / 1000),
    hash: "mock_hash"
  };

  return {
    initData: JSON.stringify(mockInitData),
    initDataUnsafe: mockInitData,
    version: "7.0",
    platform: "web",
    colorScheme: 'dark',
    themeParams: {
      bg_color: '#17212b',
      text_color: '#ffffff',
      hint_color: '#708499',
      link_color: '#6ab7ff',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      secondary_bg_color: '#232e3c'
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    headerColor: '#17212b',
    backgroundColor: '#17212b',
    isClosingConfirmationEnabled: false,
    onEvent: () => {},
    offEvent: () => {},
    sendData: () => {},
    switchInlineQuery: () => {},
    openLink: (url: string) => window.open(url, '_blank'),
    openTelegramLink: () => {},
    openInvoice: () => {},
    showPopup: (params, callback) => {
      if (callback) callback('ok');
    },
    showAlert: (message, callback) => {
      alert(message);
      if (callback) callback();
    },
    showConfirm: (message, callback) => {
      const result = confirm(message);
      if (callback) callback(result);
    },
    showScanQrPopup: () => {},
    closeScanQrPopup: () => {},
    readTextFromClipboard: () => {},
    requestWriteAccess: (callback) => {
      if (callback) callback(true);
    },
    requestContact: (callback) => {
      if (callback) callback(true);
    },
    ready: () => {},
    expand: () => {},
    close: () => {},
    MainButton: {
      text: '',
      color: '#5288c1',
      textColor: '#ffffff',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: () => {},
      onClick: () => {},
      offClick: () => {},
      show: () => {},
      hide: () => {},
      enable: () => {},
      disable: () => {},
      showProgress: () => {},
      hideProgress: () => {},
      setParams: () => {}
    },
    BackButton: {
      isVisible: false,
      onClick: () => {},
      offClick: () => {},
      show: () => {},
      hide: () => {}
    },
    SettingsButton: {
      isVisible: false,
      onClick: () => {},
      offClick: () => {},
      show: () => {},
      hide: () => {}
    },
    HapticFeedback: {
      impactOccurred: () => {},
      notificationOccurred: () => {},
      selectionChanged: () => {}
    },
    CloudStorage: {
      setItem: (key, value, callback) => {
        localStorage.setItem(key, value);
        if (callback) callback();
      },
      getItem: (key, callback) => {
        const value = localStorage.getItem(key);
        callback(undefined, value || undefined);
      },
      getItems: (keys, callback) => {
        const values: Record<string, string> = {};
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) values[key] = value;
        });
        callback(undefined, values);
      },
      removeItem: (key, callback) => {
        localStorage.removeItem(key);
        if (callback) callback();
      },
      removeItems: (keys, callback) => {
        keys.forEach(key => localStorage.removeItem(key));
        if (callback) callback();
      },
      getKeys: (callback) => {
        const keys = Object.keys(localStorage);
        callback(undefined, keys);
      }
    },
    BiometricManager: {
      isInited: false,
      isBiometricAvailable: false,
      biometricType: 'unknown',
      isAccessRequested: false,
      isAccessGranted: false,
      isBiometricTokenSaved: false,
      deviceId: 'mock_device_id',
      init: (callback) => {
        if (callback) callback();
      },
      requestAccess: (params, callback) => {
        if (callback) callback(false);
      },
      authenticate: (params, callback) => {
        if (callback) callback(false);
      },
      updateBiometricToken: (token, callback) => {
        if (callback) callback(false);
      },
      openSettings: () => {}
    }
  };
};

/**
 * Get Telegram user data
 */
export const getTelegramUser = (): TelegramUser | null => {
  const webapp = getTelegramWebApp();
  return webapp?.initDataUnsafe?.user || null;
};

/**
 * Validate Telegram WebApp init data
 */
export const validateTelegramInitData = (initData: string): boolean => {
  // In a real implementation, this would validate the hash
  // For development, we'll assume it's valid if it exists
  return !!initData;
};

/**
 * Get theme from Telegram WebApp
 */
export const getTelegramTheme = (): 'light' | 'dark' => {
  const webapp = getTelegramWebApp();
  return webapp?.colorScheme || 'dark';
};

/**
 * Show Telegram haptic feedback
 */
export const showHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
  const webapp = getTelegramWebApp();
  if (!webapp?.HapticFeedback) return;

  if (type === 'success' || type === 'error' || type === 'warning') {
    webapp.HapticFeedback.notificationOccurred(type);
  } else {
    webapp.HapticFeedback.impactOccurred(type);
  }
};
