'use client';

import { Label } from '@/components/ui/label';
import type { WizardCostDrivers } from '@/lib/budget-template-generator';

const AVAILABLE_ROLES = ['PI', 'Study Coordinator', 'CRA', 'Data Manager', 'Lab', 'Biostatistician', 'Medical Monitor'];

interface StepCostDriversProps {
  value: WizardCostDrivers;
  onChange: (v: WizardCostDrivers) => void;
}

export function StepCostDrivers({ value, onChange }: StepCostDriversProps) {
  const toggleRole = (role: string) => {
    const hasRole = value.staffRoles.includes(role);
    onChange({
      ...value,
      staffRoles: hasRole
        ? value.staffRoles.filter((r) => r !== role)
        : [...value.staffRoles, role],
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Staff roles required</Label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_ROLES.map((role) => {
            const selected = value.staffRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs border transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
        {value.staffRoles.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Selected: {value.staffRoles.join(', ')}. Each role generates a monthly cost line in Section C.
          </p>
        )}
      </div>
    </div>
  );
}
