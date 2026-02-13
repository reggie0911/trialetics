'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';

interface ProtocolSelectorProps {
  companyId: string;
  value: string | null;
  onValueChange: (protocolId: string | null) => void;
  label?: string;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export function ProtocolSelector({
  companyId,
  value,
  onValueChange,
  label = 'Protocol',
  placeholder = 'All protocols',
  showAllOption = true,
  className,
}: ProtocolSelectorProps) {
  const [protocols, setProtocols] = useState<ClinicalProtocolWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      getClinicalProtocols(companyId, { pageSize: 200 }).then((result) => {
        if (result.success && result.data) {
          setProtocols(result.data.protocols);
        }
        setIsLoading(false);
      });
    }
  }, [companyId]);

  const displayValue = value || (showAllOption ? '__all__' : '');
  const handleChange = (v: string | null) => {
    onValueChange(v === '__all__' || v === null ? null : v);
  };

  return (
    <div className={className}>
      <Label htmlFor="protocol-select" className="text-sm font-medium mb-2 block">
        {label}
      </Label>
      <Select value={displayValue} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger id="protocol-select" className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="__all__">
              <span className="text-muted-foreground">All protocols</span>
            </SelectItem>
          )}
          {protocols.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="font-medium">{p.protocol_number}</span>
              <span className="text-muted-foreground ml-1">— {p.title}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
