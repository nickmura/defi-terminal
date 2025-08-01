import { useState, useEffect } from 'react';

interface DomainLookup {
  address: string;
  domain: string | null;
  hasDomain: boolean;
  isLoading: boolean;
}

export function useDomainName(address: string | undefined): DomainLookup {
  const [domain, setDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setDomain(null);
      setIsLoading(false);
      return;
    }

    const lookupDomain = async () => {
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/domains/reverse-lookup?address=${address}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Domain lookup response:', data);
          
          // Ensure domain is a string
          const domainName = data.hasDomain && typeof data.domain === 'string' ? data.domain : null;
          setDomain(domainName);
        } else {
          setDomain(null);
        }
      } catch (error) {
        console.error('Domain lookup failed:', error);
        setDomain(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the lookup to avoid rapid API calls
    const timeoutId = setTimeout(lookupDomain, 500);
    
    return () => clearTimeout(timeoutId);
  }, [address]);

  return {
    address: address || '',
    domain,
    hasDomain: domain !== null,
    isLoading
  };
}