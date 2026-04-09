import type { IpCategory } from '@/lib/types/ip-management';

export type IpInventoryUiContext = 'ip_drug' | 'ip_device' | 'neutral';

export function getIpInventoryUiContext(categoryFilter: IpCategory | null): IpInventoryUiContext {
  if (categoryFilter === 'investigational_drug') return 'ip_drug';
  if (categoryFilter === 'investigational_device') return 'ip_device';
  return 'neutral';
}

export interface IpInventoryLogsCopy {
  groupStatus: string;
  groupDisposition: string;
  groupActions: string;
  colProduct: string;
  colLotSerial: string;
  colReceived: string;
  colDisposition: string;
  colSubject: string;
  colDispensed: string;
  colVerified: string;
  /** Drug inventory: extra column for latest container condition from ledger. */
  colContainerFill?: string;
  emptyState: string;
}

export interface IpInventorySummaryCopy {
  archivedEmpty: string;
  deleteCatalog: string;
  restoreCatalog: string;
  usedHeader: string;
  usedTooltip: string;
}

export interface IpInventoryChartsCopy {
  barSubtitle: string;
  mixSubtitle: string;
}

export interface IpDrugWorkflowCardCopy {
  title: string;
  whatItTracksHeading: string;
  whatItTracks: string[];
  coreFocusHeading: string;
  coreFocus: string[];
  workflowHeading: string;
  workflow: string[];
  quantityNote: string;
}

const IP_DRUG_WORKFLOW_CARD: IpDrugWorkflowCardCopy = {
  title: 'Investigational product scope',
  whatItTracksHeading: 'What it tracks',
  whatItTracks: [
    'Tablets, capsules, syringes, IV bags',
    'Lot numbers and expiration dates',
    'Quantity dispensed, returned, and destroyed',
  ],
  coreFocusHeading: 'Core focus',
  coreFocus: ['Dosing accuracy', 'Patient compliance', 'Full chain of custody'],
  workflowHeading: 'Typical workflow',
  workflow: [
    'Receive shipment from sponsor',
    'Log lot number, expiry, and quantity',
    'Store per protocol (for example temperature-controlled storage)',
    'Dispense to subject (record dose, date, subject ID)',
    'Track returns (unused medication, bottles)',
    'Reconcile counts',
    'Destroy or return unused drug',
  ],
  quantityNote:
    'Oral solids are tracked in countable dose units (tablets or capsules). Bottles are packaging context; ledger quantities are dose units, not bottle fractions.',
};

export function getIpDrugWorkflowCardCopy(): IpDrugWorkflowCardCopy {
  return IP_DRUG_WORKFLOW_CARD;
}

export function getIpInventoryLogsCopy(ctx: IpInventoryUiContext): IpInventoryLogsCopy {
  switch (ctx) {
    case 'ip_drug':
      return {
        groupStatus: 'IP inventory status',
        groupDisposition: 'IP disposition and custody',
        groupActions: 'Actions',
        colProduct: 'Product name',
        colLotSerial: 'Lot number and expiry',
        colReceived: 'Received by / Date received',
        colDisposition: 'Disposition',
        colSubject: 'Subject study number',
        colDispensed: 'Dispensed by / Dispensed date',
        colVerified: 'Verified by / Verified date',
        colContainerFill: 'Container condition (latest)',
        emptyState:
          'No site inventory rows yet. After the sponsor shipment arrives, receive into the central pool, log lot number, expiry, and quantity, then ship to the site and record receipt per protocol (including storage conditions).',
      };
    case 'ip_device':
      return {
        groupStatus: 'Device status',
        groupDisposition: 'Device disposition',
        groupActions: 'Actions',
        colProduct: 'Supply name',
        colLotSerial: 'Serial number / Lot number',
        colReceived: 'Received by / Date of received',
        colDisposition: 'Item disposition',
        colSubject: 'Subject study number',
        colDispensed: 'Dispensed by / Used date',
        colVerified: 'Verified by / Verified date',
        emptyState:
          'No site inventory rows. Ship from the global pool, then receive at the site when delivery arrives.',
      };
    default:
      return {
        groupStatus: 'Inventory status',
        groupDisposition: 'Disposition',
        groupActions: 'Actions',
        colProduct: 'Supply name',
        colLotSerial: 'Serial number / Lot number',
        colReceived: 'Received by / Date of received',
        colDisposition: 'Item disposition',
        colSubject: 'Subject study number',
        colDispensed: 'Dispensed by / Used date',
        colVerified: 'Verified by / Verified date',
        emptyState:
          'No site inventory rows. Ship from the global pool, then receive at the site when delivery arrives.',
      };
  }
}

export function getIpInventorySummaryCopy(ctx: IpInventoryUiContext): IpInventorySummaryCopy {
  switch (ctx) {
    case 'ip_drug':
      return {
        archivedEmpty: 'No archived catalog items match this view for the selected study.',
        deleteCatalog: 'Remove from catalog',
        restoreCatalog: 'Restore to catalog',
        usedHeader: 'Dispensed',
        usedTooltip:
          'Units recorded as dispensed to subjects (dosing and compliance tracking; inventory ledger: used disposition).',
      };
    case 'ip_device':
      return {
        archivedEmpty: 'No archived equipment matches this view for the selected study.',
        deleteCatalog: 'Delete equipment',
        restoreCatalog: 'Restore equipment',
        usedHeader: 'Used',
        usedTooltip: 'Units recorded as used (inventory ledger: used disposition).',
      };
    default:
      return {
        archivedEmpty: 'No archived inventory items match this view for the selected study.',
        deleteCatalog: 'Delete equipment',
        restoreCatalog: 'Restore equipment',
        usedHeader: 'Used',
        usedTooltip: 'Units recorded as used (inventory ledger: used disposition).',
      };
  }
}

export function getIpInventoryChartsCopy(ctx: IpInventoryUiContext): IpInventoryChartsCopy {
  switch (ctx) {
    case 'ip_drug':
      return {
        barSubtitle:
          'Point-in-time bars show stock now; cumulative bars (sent, returns, received at site) support reconciliation and chain-of-custody review. Cumulative totals use neutral and warning tones so they are not read as on-hand stock.',
        mixSubtitle: 'Sum of global in-stock and site on-hand quantities for the filtered catalog.',
      };
    default:
      return {
        barSubtitle:
          'Grouped bars: point-in-time stock uses solid primary tones; cumulative ledger totals (sent, returns) use neutral and warning tones so they are not read as on-hand stock.',
        mixSubtitle: 'Sum of global in-stock and site on-hand quantities.',
      };
  }
}

/** Copy for Add order when the catalog item is an investigational drug (quantity = bottle/pack/etc. per catalog unit). */
export interface IpAddOrderDrugCopy {
  dialogDescription: string;
  quantityLabel: string;
  catalogUnitHelper: (catalogUnit: string) => string;
  contentsPerUnitLabel: string;
  contentsPerUnitHelper: (catalogUnit: string) => string;
  toastCreatedOne: (catalogUnit: string) => string;
  toastCreatedMany: (qty: number, catalogUnit: string) => string;
}

export function getAddOrderDrugCopy(): IpAddOrderDrugCopy {
  return {
    dialogDescription:
      'Quantity is the number of shipping and receipt units (such as bottles, packs, vials, or kits), using the catalog unit defined for this product. Do not enter individual tablets or capsules unless the catalog unit is explicitly a dose unit (for example Tablet).',
    quantityLabel: 'Quantity (catalog unit)',
    catalogUnitHelper: (catalogUnit: string) =>
      catalogUnit.trim().length > 0
        ? `Catalog unit: ${catalogUnit.trim()}`
        : 'Set the catalog unit on the product in Edit inventory if this looks wrong.',
    contentsPerUnitLabel: 'Contents per catalog unit (optional)',
    contentsPerUnitHelper: (catalogUnit: string) => {
      const u = catalogUnit.trim().toLowerCase();
      if (u.includes('bottle') || u.includes('vial') || u.includes('blister'))
        return 'Tablets or capsules in each bottle, vial, or blister pack. Does not change how many catalog units you ship.';
      if (u.includes('box') || u.includes('carton') || u.includes('case'))
        return 'Packs, bottles, or blister cards inside each box, carton, or case. Does not change how many catalog units you ship.';
      if (u.includes('kit') || u.includes('pack'))
        return 'Syringes, pens, or doses inside each kit or pack (for example 4 syringes per pack). Does not change how many catalog units you ship.';
      if (u.includes('pen') || u.includes('injector'))
        return 'Doses or cartridges per pen or injector. Does not change how many catalog units you ship.';
      return 'Smaller units inside each catalog unit—for example tablets per bottle, syringes per kit, ampules per tray, patches per pouch, or doses per pen. Does not change how many catalog units you ship.';
    },
    toastCreatedOne: (catalogUnit: string) => {
      const u = catalogUnit.trim();
      return u.length > 0
        ? `Stock was moved to this site. Counts are in ${u} (one line).`
        : 'Stock was moved from central inventory to this site.';
    },
    toastCreatedMany: (qty: number, catalogUnit: string) => {
      const u = catalogUnit.trim() || 'catalog unit';
      return `${qty} separate inventory lines were created at this site—one ${u} per line.`;
    },
  };
}

/** Add inventory: how the Unit field is used (non-drug / non-product-specific). */
export const ADD_INVENTORY_UNIT_TOOLTIP_NEUTRAL =
  'Receiving, shipping, and site summaries count in this unit (for example Each, Kit, Case, or Box). Pick the unit you actually track in the ledger.';

/**
 * Add inventory: tooltip for optional “contents per catalog unit”.
 * Investigational drug uses the drug-specific helper; other categories use plain-language examples.
 */
export function getAddInventoryContentsPerUnitTooltip(
  category: IpCategory,
  drugCopy: Pick<IpAddOrderDrugCopy, 'contentsPerUnitHelper'>,
  catalogUnit: string
): string {
  if (category === 'investigational_drug') {
    return drugCopy.contentsPerUnitHelper(catalogUnit);
  }
  const u = catalogUnit.trim() || 'catalog unit';
  if (category === 'investigational_device') {
    return `Smaller countable units inside each ${u}—for example sensors or cartridges per kit, strips per pouch, or single-use pieces per sealed pack. Shipment and receipt quantities still use the catalog unit; this is optional detail for labeling and planning.`;
  }
  if (category === 'medical_equipment') {
    return `Smaller countable units inside each ${u}—for example electrodes per set, probes per kit, or disposable tips per box. Shipment and receipt quantities still use the catalog unit; this is optional detail for labeling and planning.`;
  }
  return `Smaller countable units inside each ${u}—for example gloves per box, specimen tubes per pack, or booklets per kit. Shipment and receipt quantities still use the catalog unit; this is optional detail for labeling and planning.`;
}

/** Edit inventory: short description under “default contents” (all categories). */
export const EDIT_INVENTORY_DEFAULT_CONTENTS_DESCRIPTION =
  'Optional: how many smaller units are inside one catalog unit (for example tablets per bottle or pairs per box). Prefills the same optional field when adding a site order when supported. Leave blank to clear the saved default.';
