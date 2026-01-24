'use client';

import { useEffect, useState } from 'react';

interface GreetingProps {
  firstName?: string | null;
  displayName?: string | null;
}

export function Greeting({ firstName, displayName }: GreetingProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let greetingText = 'Good Evening';
    
    if (hour >= 0 && hour < 12) {
      greetingText = 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      greetingText = 'Good Afternoon';
    }
    
    setGreeting(greetingText);
  }, []);

  // Use display name if provided, otherwise use first name
  const nameToDisplay = displayName || firstName;

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
        {greeting}{nameToDisplay ? ` ${nameToDisplay}` : ''}!
      </h1>
      <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-md animate-pulse">
        Beta
      </span>
    </div>
  );
}
