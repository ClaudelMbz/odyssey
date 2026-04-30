import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Machine } from '../types';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Activity, Zap, Info, ChevronRight, AlertCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../components/AuthContainer';

export default function MachineList() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const seedData = async (currentMachines: Machine[] = machines) => {
    try {
      const machinesData = [
        { 
          name: 'Shredder S1', 
          type: 'shredder', 
          status: 'running', 
          serialNumber: 'PO-SH-001', 
          totalHours: 146, 
          manualUrl: 'https://technology.plasticodyssey.org/broyeur-recyclage-plastique/#maintenance',
          sensors: { 
            temperature: 39, 
            vibration: 0.12, 
            energyConsumption: 2.1 
          } 
        },
        { 
          name: 'Extruder E1', 
          type: 'extruder', 
          status: 'idle', 
          serialNumber: 'PO-EX-001', 
          totalHours: 852, 
          manualUrl: 'https://technology.plasticodyssey.org/extrudeuse-recyclage/#maintenance',
          sensors: { 
            temperature: 195, 
            vibration: 0.08, 
            energyConsumption: 5.4 
          } 
        },
      ];

      for (const m of machinesData) {
        // Only add if it doesn't exist yet
        const exists = currentMachines.some(existing => existing.serialNumber === m.serialNumber);
        if (!exists) {
          await addDoc(collection(db, 'machines'), {
            ...m,
            lastMaintenance: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'machines');
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'machines'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
      setMachines(data);
      setLoading(false);
      
      // Auto-initialize if inventory is missing expected machines
      if (snapshot.size < 2) {
        seedData(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'machines');
    });

    return unsubscribe;
  }, [user]);

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Machine Inventory</h1>
          <p className="text-slate-500 mt-1">Manage and monitor core micro-factory units.</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search equipment..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <Activity className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-500">Scanning inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredMachines.map((machine) => (
            <Link to={`/machines/${machine.id}`} key={machine.id}>
              <div 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer relative"
              >
                {machine.status === 'failure' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                )}
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-4 rounded-2xl bg-slate-900 text-white shadow-xl",
                      machine.status === 'running' ? 'shadow-emerald-500/10' : 
                      machine.status === 'failure' ? 'shadow-rose-500/20' : 'shadow-slate-500/10'
                    )}>
                      {machine.type === 'shredder' ? <Activity size={28} /> : <Zap size={28} />}
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      machine.status === 'running' ? 'bg-emerald-100 text-emerald-700' : 
                      machine.status === 'failure' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    )}>
                      {machine.status}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{machine.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Local Factory • {machine.serialNumber}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperature</p>
                      <p className={cn("text-lg font-black", machine.sensors.temperature > 80 ? "text-rose-500" : "text-slate-900")}>
                        {machine.sensors.temperature}°C
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vibration</p>
                      <p className={cn("text-lg font-black", machine.sensors.vibration > 0.6 ? "text-rose-500" : "text-slate-900")}>
                        {machine.sensors.vibration > 0.6 ? "Critical" : "Normal"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runtime</p>
                      <p className="text-lg font-black text-slate-900">{machine.totalHours}h</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex bg-slate-50 px-3 py-1.5 rounded-full items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        machine.status === 'running' ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                      )} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">System Live</span>
                    </div>
                    <div className="flex items-center gap-6">
                      {machine.manualUrl && (
                        <a 
                          href={machine.manualUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
                        >
                          <BookOpen size={14} />
                          Guide link
                        </a>
                      )}
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                        Open Dashboard
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {filteredMachines.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
              <AlertCircle size={40} className="mb-4" />
              <p className="font-bold">No machines found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
