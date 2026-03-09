'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getContacts } from '@/lib/actions/contacts';

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface ContactPickerProps {
  companyId: string;
  value: string;
  onChange: (value: string) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ContactPicker({
  companyId,
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Select contact',
  className,
  disabled,
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getContacts(companyId, { pageSize: 200 });
        if (result.success && result.data) {
          const list = result.data.contacts
            .filter((c) => !excludeIds.includes(c.id))
            .map((c) => ({
              id: c.id,
              first_name: c.first_name || '',
              last_name: c.last_name || '',
              email: c.email ?? null,
            }));
          setContacts(list);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, excludeIds.join(',')]);

  const displayName = (c: ContactOption) =>
    c.first_name || c.last_name
      ? `${c.first_name} ${c.last_name}`.trim()
      : (c.email ?? c.id);

  const getDisplayLabel = (id: string | null) => {
    if (!id) return null;
    const c = contacts.find((x) => x.id === id);
    return c ? displayName(c) : null;
  };

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={`h-8 text-xs ${className ?? ''}`}>
        <SelectValue
          placeholder={loading ? 'Loading...' : placeholder}
          getDisplayLabel={getDisplayLabel}
        />
      </SelectTrigger>
      <SelectContent>
        {contacts.map((c) => (
          <SelectItem key={c.id} value={c.id} className="text-xs">
            {displayName(c)}
          </SelectItem>
        ))}
        {!loading && contacts.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No contacts found</div>
        )}
      </SelectContent>
    </Select>
  );
}
