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
    <h1 className="text-4xl font-semibold tracking-tight">
      {greeting}{nameToDisplay ? ` ${nameToDisplay}` : ''}!
    </h1>
  );
}
