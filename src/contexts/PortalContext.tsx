import React, { createContext, useContext, useState, useEffect } from 'react';

interface PortalContextType {
  portalName: string | null;
  setPortalName: (name: string | null) => void;
  isLoading: boolean;
  isAdmin: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};

interface PortalProviderProps {
  children: React.ReactNode;
}

export const PortalProvider: React.FC<PortalProviderProps> = ({ children }) => {
  const [portalName, setPortalName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initializePortalContext = async () => {
      // Check if we're embedded in an iframe
      const embedded = window.self !== window.top;
      const isProduction = import.meta.env.PROD;
      const requireAuth = isProduction || import.meta.env.VITE_REQUIRE_AUTH === 'true';

      // Check URL parameters for portal
      const urlParams = new URLSearchParams(window.location.search);
      const portalFromUrl = urlParams.get('portal');
      
      // Check if this is admin mode (measurelab portal)
      const isAdminPortal = portalFromUrl?.toLowerCase() === 'measurelab';
      setIsAdmin(isAdminPortal);
      
      if (embedded && requireAuth) {
        // For iframe embedding, we'll extract portal from URL params or referrer
        // since direct API calls from iframe won't have the auth headers
        
        if (portalFromUrl) {
          setPortalName(portalFromUrl);
        }
      } else {
        // Direct access
        if (portalFromUrl) {
          setPortalName(portalFromUrl);
        }
      }
      
      setIsLoading(false);
    };

    initializePortalContext();
  }, []);

  const value = {
    portalName,
    setPortalName,
    isLoading,
    isAdmin,
  };

  return (
    <PortalContext.Provider value={value}>
      {children}
    </PortalContext.Provider>
  );
};