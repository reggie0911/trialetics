'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Address,
  AddressType,
  ADDRESS_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';

export interface AddressFormData {
  address_type: AddressType;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
}

interface AddressFormProps {
  value: AddressFormData;
  onChange: (value: AddressFormData) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  defaultOpen?: boolean;
}

const emptyAddress: AddressFormData = {
  address_type: 'primary',
  street_1: '',
  street_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United States',
  is_primary: false,
};

export function AddressForm({
  value,
  onChange,
  onRemove,
  showRemove = false,
  defaultOpen = true,
}: AddressFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleChange = (field: keyof AddressFormData, newValue: string | boolean) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  const hasAddress = value.street_1 || value.city || value.state || value.postal_code;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md">
      <CollapsibleTrigger className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 w-full">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Address</span>
          {hasAddress && (
            <span className="text-xs text-muted-foreground">
              ({value.city || 'No city'}{value.state ? `, ${value.state}` : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-3 pt-2 border-t">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="address_type" className="text-xs">Address Type</Label>
              <Select
                value={value.address_type}
                onValueChange={(v) => v && handleChange('address_type', v as AddressType)}
              >
                <SelectTrigger className="text-xs md:text-xs h-8 w-full">
                  <span className="text-xs capitalize">
                    {value.address_type ? ADDRESS_TYPE_LABELS[value.address_type] || value.address_type : 'Select type'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ADDRESS_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox
                id="is_primary"
                checked={value.is_primary}
                onCheckedChange={(checked) => handleChange('is_primary', !!checked)}
              />
              <Label htmlFor="is_primary" className="text-xs font-normal cursor-pointer">
                Primary address
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="street_1" className="text-xs">Street Address</Label>
            <Input
              id="street_1"
              value={value.street_1}
              onChange={(e) => handleChange('street_1', e.target.value)}
              placeholder="123 Main Street"
              className="text-xs placeholder:text-xs md:text-xs h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="street_2" className="text-xs">Street Address 2</Label>
            <Input
              id="street_2"
              value={value.street_2}
              onChange={(e) => handleChange('street_2', e.target.value)}
              placeholder="Suite 100"
              className="text-xs placeholder:text-xs md:text-xs h-8"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">City</Label>
              <Input
                id="city"
                value={value.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City"
                className="text-xs placeholder:text-xs md:text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="state" className="text-xs">State / Province</Label>
              <Input
                id="state"
                value={value.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="State"
                className="text-xs placeholder:text-xs md:text-xs h-8"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="postal_code" className="text-xs">Postal Code</Label>
              <Input
                id="postal_code"
                value={value.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                placeholder="12345"
                className="text-xs placeholder:text-xs md:text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country" className="text-xs">Country</Label>
              <Input
                id="country"
                value={value.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="United States"
                className="text-xs placeholder:text-xs md:text-xs h-8"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Helper to convert Address to AddressFormData
export function addressToFormData(address: Address | null): AddressFormData {
  if (!address) return { ...emptyAddress };
  return {
    address_type: address.address_type,
    street_1: address.street_1 || '',
    street_2: address.street_2 || '',
    city: address.city || '',
    state: address.state || '',
    postal_code: address.postal_code || '',
    country: address.country || 'United States',
    is_primary: address.is_primary,
  };
}

// Helper to check if address has any data
export function hasAddressData(data: AddressFormData): boolean {
  return !!(data.street_1 || data.street_2 || data.city || data.state || data.postal_code);
}

export { emptyAddress };
