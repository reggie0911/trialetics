'use client';

import { useEffect, useState } from 'react';

interface GreetingProps {
  firstName?: string | null;
}

export function Greeting({ firstName }: GreetingProps) {
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

  // First name is used as the display name
  const nameToDisplay = firstName;

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
        {greeting}{nameToDisplay ? ` ${nameToDisplay}` : ''}!
      </h1>
    </div>
  );
}
