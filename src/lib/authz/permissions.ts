export const PERMISSIONS = {
  supplierView: 'supplier.view',
  supplierManage: 'supplier.manage',
  itemView: 'item.view',
  itemManage: 'item.manage',
  receivingCreate: 'receiving.create',
  receivingReleaseHold: 'receiving.release_hold',
  inventoryView: 'inventory.view',
  inventoryAdjust: 'inventory.adjust',
  purchasingView: 'purchasing.view',
  complianceView: 'compliance.view',
  accountingView: 'accounting.view',
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
