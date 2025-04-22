import React, { useState, useEffect } from 'react';
import { Globe, Shield, Loader2 } from 'lucide-react';

interface ProxyStatusProps {
  className?: string;
}

const ProxyStatus: React.FC<ProxyStatusProps> = ({ className = '' }) => {
  const [proxyCount, setProxyCount] = useState<number>(0);
  const [usingProxy, setUsingProxy] = useState<boolean>(false);
  const [lastUsedProxy, setLastUsedProxy] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testProgress, setTestProgress] = useState<{
    total: number;
    tested: number;
    valid: number;
  }>({ total: 0, tested: 0, valid: 0 });

  useEffect(() => {
    // Function to check the proxy status from our global state
    const updateProxyStatus = () => {
      // Access the global proxy state from the window object
      const proxyState = (window as any).__proxyState;
      if (proxyState) {
        setProxyCount(proxyState.count || 0);
        setUsingProxy(proxyState.active || false);
        setLastUsedProxy(proxyState.lastProxy || '');
        setTesting(proxyState.testing || false);
        setTestProgress({
          total: proxyState.countTesting || 0,
          tested: proxyState.countTested || 0,
          valid: proxyState.countValid || 0
        });
      }
    };

    // Initial update
    updateProxyStatus();

    // Set up a listener for proxy state changes
    window.addEventListener('proxy-state-changed', updateProxyStatus);

    // Clean up
    return () => {
      window.removeEventListener('proxy-state-changed', updateProxyStatus);
    };
  }, []);

  // Don't show anything if no proxies are loaded and not currently testing
  if (proxyCount === 0 && !testing) {
    return null;
  }

  // Show testing state
  if (testing) {
    const progress = testProgress.total > 0 
      ? Math.round((testProgress.tested / testProgress.total) * 100) 
      : 0;
      
    return (
      <div className={`flex items-center text-xs ${className}`}>
        <Loader2 className="h-3 w-3 mr-1 text-blue-500 animate-spin" />
        <span title={`Testing proxies: ${testProgress.valid} working so far`}>
          {progress > 0 ? `Testing proxies: ${progress}%` : 'Testing proxies...'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center text-xs ${className}`}>
      {usingProxy ? (
        <Shield className="h-3 w-3 mr-1 text-green-500" />
      ) : (
        <Globe className="h-3 w-3 mr-1 text-gray-500" />
      )}
      <span title={`Last proxy: ${lastUsedProxy}`}>
        {usingProxy ? 'Proxy Active' : `${proxyCount} Proxies Available`}
      </span>
    </div>
  );
};

export default ProxyStatus; 