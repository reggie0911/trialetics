'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Briefcase } from 'lucide-react';
import {
  getPositionTypes,
  getRateLists,
  getRateListWithItems,
  createPositionType,
  createRateList,
  upsertRateListItem,
  type PositionType,
  type RateList,
} from '@/lib/actions/rate-lists';
import { useToast } from '@/hooks/use-toast';

interface RateListsClientProps {
  companyId: string;
}

export function RateListsClient({ companyId }: RateListsClientProps) {
  const { toast } = useToast();
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [rateLists, setRateLists] = useState<RateList[]>([]);
  const [selectedRateListId, setSelectedRateListId] = useState<string | null>(null);
  const [rateListItems, setRateListItems] = useState<Array<{ position_type_id: string; hourly_rate: number }>>([]);
  const [newPositionName, setNewPositionName] = useState('');
  const [newRateListName, setNewRateListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [pts, rls] = await Promise.all([
      getPositionTypes(companyId),
      getRateLists(companyId),
    ]);
    setPositionTypes(pts);
    setRateLists(rls);
    if (rls.length > 0 && !selectedRateListId) {
      setSelectedRateListId(rls[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  useEffect(() => {
    if (!selectedRateListId) return;
    getRateListWithItems(selectedRateListId).then((data) => {
      if (data) {
        const itemMap = new Map(
          data.items.map((i) => [i.position_type_id, i.hourly_rate])
        );
        const merged = positionTypes.map((p) => ({
          position_type_id: p.id,
          hourly_rate: itemMap.get(p.id) ?? 0,
        }));
        setRateListItems(merged);
      }
    });
  }, [selectedRateListId, positionTypes]);

  const handleAddPositionType = async () => {
    if (!newPositionName.trim()) return;
    const result = await createPositionType(companyId, { name: newPositionName.trim() });
    if (result.success) {
      toast({ title: 'Success', description: 'Position type added' });
      setNewPositionName('');
      loadData();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddRateList = async () => {
    if (!newRateListName.trim()) return;
    const result = await createRateList(companyId, { name: newRateListName.trim() });
    if (result.success) {
      toast({ title: 'Success', description: 'Rate list created' });
      setNewRateListName('');
      loadData();
      if (result.data) setSelectedRateListId(result.data.id);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleUpdateRate = async (positionTypeId: string, hourlyRate: number) => {
    if (!selectedRateListId) return;
    const result = await upsertRateListItem(selectedRateListId, positionTypeId, hourlyRate);
    if (result.success) {
      toast({ title: 'Updated', description: 'Rate saved' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Position Types
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add position type (e.g. CRA, Consultant)"
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPositionType()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAddPositionType}>
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : positionTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No position types yet</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {positionTypes.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Rate Lists
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="New rate list name"
              value={newRateListName}
              onChange={(e) => setNewRateListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRateList()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAddRateList}>
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rateLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rate lists yet</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {rateLists.map((rl) => (
                  <Button
                    key={rl.id}
                    variant={selectedRateListId === rl.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRateListId(rl.id)}
                  >
                    {rl.name}
                  </Button>
                ))}
              </div>
              {selectedRateListId && (
                <div className="space-y-2">
                  <Label className="text-xs">Hourly rates</Label>
                  {positionTypes.map((pt) => {
                    const item = rateListItems.find((i) => i.position_type_id === pt.id);
                    const rate = item?.hourly_rate ?? 0;
                    return (
                      <div key={pt.id} className="flex items-center gap-2">
                        <span className="text-sm w-32">{pt.name}</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={rate || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setRateListItems((prev) => {
                              const idx = prev.findIndex((i) => i.position_type_id === pt.id);
                              const updated = [...prev];
                              if (idx >= 0) updated[idx] = { ...updated[idx], hourly_rate: v };
                              else updated.push({ position_type_id: pt.id, hourly_rate: v });
                              return updated;
                            });
                          }}
                          onBlur={(e) => handleUpdateRate(pt.id, parseFloat(e.target.value) || 0)}
                          className="w-24 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">/hr</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
