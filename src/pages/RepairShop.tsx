import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PrintJob, Machine } from '../types';
import { useAuth } from '../components/AuthContainer';
import { 
  Printer, 
  Plus, 
  Search, 
  Clock, 
  Box, 
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Hammer
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function RepairShop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prints, setPrints] = useState<PrintJob[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch machines for referencing names
    const fetchMachines = async () => {
      const q = query(collection(db, 'machines'));
      const snap = await getDocs(q);
      setMachines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine)));
    };

    fetchMachines();

    const q = query(collection(db, 'prints'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintJob)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prints');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredPrints = prints.filter(p => 
    p.partName.toLowerCase().includes(search.toLowerCase()) ||
    p.material.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <Hammer size={24} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Repair Shop</h1>
          </div>
          <p className="text-slate-500 font-bold ml-11">Technician workspace for 3D printing & part restoration</p>
        </div>

        <Link 
          to="/repair-shop/new"
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={20} />
          NEW PRINT JOB
        </Link>
      </header>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search by part name or material..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* History List */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Live Printing Log</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-time update</span>
              </div>
            </div>

            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Activity className="animate-spin text-blue-600" size={40} />
                <p className="text-slate-400 font-bold">Synchronizing history...</p>
              </div>
            ) : filteredPrints.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-slate-400 font-bold">No print jobs found matching your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Part & Machine</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Material</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/50">
                    {filteredPrints.map((job) => {
                      const machine = machines.find(m => m.id === job.machineId);
                      const date = job.timestamp?.toDate ? job.timestamp.toDate() : new Date(job.timestamp);

                      return (
                        <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold">
                                <Printer size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{job.partName}</p>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">Machine: {machine?.name || 'Unknown'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {job.material}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              {job.status === 'printing' ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                  <Activity size={12} className="animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Printing</span>
                                </div>
                              ) : job.status === 'completed' ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                  <CheckCircle2 size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Finished</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                  <AlertCircle size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-slate-900">{format(date, 'MMM d, HH:mm')}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {job.estimatedDuration} min est.
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stats / Help Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-slate-200">
            <h3 className="text-xl font-black flex items-center gap-3">
              <Box size={24} className="text-blue-400" />
              Inventory
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-bold text-slate-400">PET Filament</span>
                <span className="text-lg font-black tracking-tight text-blue-400">8.4kg</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-bold text-slate-400">HDPE Pellets</span>
                <span className="text-lg font-black tracking-tight text-emerald-400">42kg</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-bold text-slate-400">PETG Resin</span>
                <span className="text-lg font-black tracking-tight text-orange-400">1.2L</span>
              </div>
            </div>
            <button className="w-full py-4 bg-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50">
              Low Material Alert
            </button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Printer Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Unit #1 (Prusa XL)</span>
                <span className="text-emerald-500">Online</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[85%]" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Unit #2 (Bambu Lab)</span>
                <span className="text-blue-400 font-black italic">In Progress</span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[45%] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
