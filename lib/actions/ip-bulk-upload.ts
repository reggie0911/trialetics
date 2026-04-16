'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertIpMinTier } from '@/lib/server/ip-access';
import type { IpCategory } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS } from '@/lib/types/ip-management';
import {
  submitAddInventory,
  linkIpCatalogItemToStudySite,
  createIpOrder,
} from '@/lib/actions/ip-management';
import { normalizeBulkCsvExpiryDate } from '@/lib/utils/ip-bulk-csv-template';

const IP_PATH = '/protected/inventory-management';

function isValidIpCategory(value: string): value is IpCategory {
  return Object.prototype.hasOwnProperty.call(IP_CATEGORY_LABELS, value);
}

function normalizeSiteName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface StudySiteRow {
  id: string;
  site_number: string;
  name: string | null;
}

function resolveStudySite(
  sites: StudySiteRow[],
  siteNumber: string,
  siteName: string
): { studySiteId: string } | { error: string } {
  const num = siteNumber.trim();
  const name = siteName.trim();

  if (!num && !name) {
    return { error: 'site_number or site_name is required' };
  }

  const byNumber = num ? sites.find((s) => String(s.site_number) === num) : undefined;
  const nameNorm = name ? normalizeSiteName(name) : '';
  const byName = nameNorm
    ? sites.filter((s) => normalizeSiteName(s.name ?? '') === nameNorm)
    : [];

  if (num && name) {
    if (!byNumber) {
      return { error: `site_number "${num}" does not match any study site` };
    }
    if (byName.length === 0) {
      return { error: `site_name "${name}" does not match any study site` };
    }
    if (byName.length > 1) {
      return { error: `site_name "${name}" matches more than one study site; use site_number or a unique name` };
    }
    if (byNumber.id !== byName[0].id) {
      return { error: 'site_number and site_name refer to different study sites' };
    }
    return { studySiteId: byNumber.id };
  }

  if (num) {
    if (!byNumber) {
      return { error: `site_number "${num}" does not match any study site` };
    }
    return { studySiteId: byNumber.id };
  }

  if (byName.length === 0) {
    return { error: `site_name "${name}" does not match any study site` };
  }
  if (byName.length > 1) {
    return { error: `site_name "${name}" matches more than one study site; use site_number or a unique name` };
  }
  return { studySiteId: byName[0].id };
}

export interface BulkUploadRow {
  item_name: string;
  category: string;
  unit: string;
  part_number: string;
  contents_per_unit: string;
  site_number: string;
  site_name: string;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
  serial_number: string;
  quantity: string;
  order_reference: string;
}

export interface BulkUploadResult {
  succeeded: number;
  failed: { rowIndex: number; error: string }[];
}

export async function bulkUploadInventory(
  studyId: string,
  rows: BulkUploadRow[]
): Promise<BulkUploadResult> {
  const resolution = await assertIpMinTier(studyId, 'sponsor');
  if (
    resolution.tier !== 'admin' &&
    !resolution.teamRoles.includes('clinical_project_manager')
  ) {
    throw new Error('Only Clinical Project Managers or Admins can bulk upload inventory.');
  }

  if (!rows.length) throw new Error('No rows provided.');
  if (rows.length > 500) throw new Error('Maximum 500 rows per upload.');

  const supabase = await createClient();

  const { data: studySites, error: sitesErr } = await supabase
    .from('study_sites')
    .select('id, site_number, name')
    .eq('study_id', studyId);
  if (sitesErr) throw new Error(sitesErr.message);

  const sites: StudySiteRow[] = (studySites ?? []).map((s) => ({
    id: s.id as string,
    site_number: String(s.site_number),
    name: (s.name as string | null) ?? null,
  }));

  interface ItemGroup {
    itemName: string;
    category: IpCategory;
    unit: string;
    partNumber: string;
    contentsPerUnit: number | undefined;
    totalQty: number;
    siteIds: Set<string>;
    rows: { rowIndex: number; row: BulkUploadRow; studySiteId: string }[];
  }

  const itemGroups = new Map<string, ItemGroup>();
  const result: BulkUploadResult = { succeeded: 0, failed: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const itemKey = row.item_name.trim().toLowerCase();

    if (!row.item_name.trim()) {
      result.failed.push({ rowIndex: i, error: 'item_name is required' });
      continue;
    }
    if (!isValidIpCategory(row.category.trim())) {
      result.failed.push({ rowIndex: i, error: `Invalid category: "${row.category}"` });
      continue;
    }

    const siteRes = resolveStudySite(sites, row.site_number, row.site_name);
    if ('error' in siteRes) {
      result.failed.push({ rowIndex: i, error: siteRes.error });
      continue;
    }
    const { studySiteId } = siteRes;

    const qty = parseInt(row.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      result.failed.push({ rowIndex: i, error: 'quantity must be an integer >= 1' });
      continue;
    }
    if (row.serial_number.trim() && qty !== 1) {
      result.failed.push({
        rowIndex: i,
        error: 'quantity must be 1 when serial_number is provided',
      });
      continue;
    }

    let contentsPerUnit: number | undefined;
    if (row.contents_per_unit.trim()) {
      const c = parseInt(row.contents_per_unit, 10);
      if (Number.isFinite(c) && c >= 1) contentsPerUnit = c;
    }

    const existing = itemGroups.get(itemKey);
    if (existing) {
      existing.totalQty += qty;
      existing.siteIds.add(studySiteId);
      existing.rows.push({ rowIndex: i, row, studySiteId });
    } else {
      itemGroups.set(itemKey, {
        itemName: row.item_name.trim(),
        category: row.category.trim() as IpCategory,
        unit: row.unit.trim() || 'Each',
        partNumber: row.part_number.trim(),
        contentsPerUnit,
        totalQty: qty,
        siteIds: new Set([studySiteId]),
        rows: [{ rowIndex: i, row, studySiteId }],
      });
    }
  }

  for (const group of itemGroups.values()) {
    let itemId: string;

    try {
      const addResult = await submitAddInventory({
        studyId,
        mode: 'new',
        newItemName: group.itemName,
        category: group.category,
        unit: group.unit,
        partOrMaterialNumber: group.partNumber || null,
        quantity: group.totalQty,
        receiptMetadata: {},
        ...(group.contentsPerUnit != null
          ? { defaultContentsPerCatalogUnit: group.contentsPerUnit }
          : {}),
      });
      itemId = addResult.itemId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error creating item';
      for (const { rowIndex } of group.rows) {
        result.failed.push({ rowIndex, error: `Failed to create item "${group.itemName}": ${msg}` });
      }
      continue;
    }

    const siteIdLinkOk = new Set<string>();
    for (const studySiteId of group.siteIds) {
      try {
        await linkIpCatalogItemToStudySite({ studyId, itemId, studySiteId });
        siteIdLinkOk.add(studySiteId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        for (const { rowIndex, studySiteId: sid } of group.rows) {
          if (sid === studySiteId) {
            result.failed.push({
              rowIndex,
              error: `Failed to link "${group.itemName}" to site: ${msg}`,
            });
          }
        }
      }
    }

    for (const { rowIndex, row, studySiteId } of group.rows) {
      if (!siteIdLinkOk.has(studySiteId)) continue;

      const qty = Math.max(1, parseInt(row.quantity, 10) || 1);
      let expiryDate: string | undefined;
      const expiryRaw = row.expiry_date.trim();
      if (expiryRaw) {
        const norm = normalizeBulkCsvExpiryDate(row.expiry_date);
        if (!norm) {
          result.failed.push({ rowIndex, error: 'Invalid expiry_date' });
          continue;
        }
        expiryDate = norm;
      }
      try {
        await createIpOrder({
          studyId,
          studySiteId,
          itemId,
          lotNumber: row.lot_number.trim() || undefined,
          batchNumber: row.batch_number.trim() || undefined,
          expiryDate,
          serialNumber: row.serial_number.trim() || undefined,
          quantity: qty,
          orderReference: row.order_reference.trim() || undefined,
          ...(group.contentsPerUnit != null
            ? { contentsPerCatalogUnit: group.contentsPerUnit }
            : {}),
        });
        result.succeeded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        result.failed.push({ rowIndex, error: `Failed to create order: ${msg}` });
      }
    }
  }

  revalidatePath(IP_PATH);
  revalidateStudyCtmsLayout(studyId);
  return result;
}
