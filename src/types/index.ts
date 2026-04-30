export type MachineType = 
  | 'shredder' 
  | 'extruder' 
  | 'press' 
  | 'shifter' 
  | 'washing_tank' 
  | 'centrifuge' 
  | 'pyrolysis' 
  | 'plate_press' 
  | 'compactor';

export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'failure';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: MachineStatus;
  serialNumber: string;
  totalHours: number;
  lastMaintenance?: any; // Firestore Timestamp
  sensors: {
    temperature: number;
    vibration: number;
    energyConsumption: number;
  };
  manualUrl?: string;
}

export interface MaintenanceTask {
  taskId: string;
  label: string;
  completed: boolean;
  category?: string;
}

export interface Intervention {
  id: string;
  machineId: string;
  technicianId: string;
  type: 'preventive' | 'corrective';
  timestamp: any; // Firestore Timestamp
  tasks: MaintenanceTask[];
  notes?: string;
  partsReplaced: string[];
  durationMinutes: number;
}

export interface UserRole {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'technician' | 'manager';
}
