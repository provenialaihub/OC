export const PERMISSIONS = {
  supplierView: 'supplier.view',
  supplierManage: 'supplier.manage',
  itemView: 'item.view',
  itemManage: 'item.manage',
  receivingCreate: 'receiving.create',
  inventoryView: 'inventory.view',
  purchasingView: 'purchasing.view',
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
