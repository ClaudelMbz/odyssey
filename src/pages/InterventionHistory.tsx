import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Intervention, Machine } from '../types';
import { useAuth } from '../components/AuthContainer';
import { formatDistanceToNow, format } from 'date-fns';
import { ClipboardList, Clock, Search, Filter, History, Activity, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function InterventionHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch machines once to map IDs to names
    const fetchMachines = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'machines'));
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
        setMachines(docs);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'machines');
      }
    };
    fetchMachines();

    const q = query(collection(db, 'interventions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
      setInterventions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interventions');
    });

    return unsubscribe;
  }, [user]);

  const filteredInterventions = interventions.filter(inter => {
    const machine = machines.find(m => m.id === inter.machineId);
    const searchString = `${machine?.name || ''} ${inter.type} ${machine?.serialNumber || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium tracking-tight">Loading intervention history...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-slate-900">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Intervention History</h1>
          <p className="text-slate-500 mt-1 font-medium">Global log of all maintenance actions performed on factory units.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
          <History size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-700">{interventions.length} Total Logs</span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by machine name or serial..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Calendar size={16} />
            Date Range
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Machine Unit</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Technician</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInterventions.map((log) => {
                const machine = machines.find(m => m.id === log.machineId);
                const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                
                return (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/interventions/${log.id}`)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {format(date, 'MMM d, yyyy')}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic flex items-center gap-1">
                          <Clock size={10} />
                          {format(date, 'HH:mm')} • {formatDistanceToNow(date, { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="secondary-icon bg-blue-50 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs group-hover:bg-blue-100 transition-colors">
                          {machine?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{machine?.name || 'Unknown'}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{machine?.serialNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        log.type === 'preventive' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-orange-50 text-orange-700 border-orange-100"
                      )}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          T
                        </div>
                        <span className="text-sm font-bold text-slate-700">Internal Tech</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-900">
                            {log.tasks?.length || 0} tasks completed
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {log.durationMinutes} min
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInterventions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                    No intervention records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
