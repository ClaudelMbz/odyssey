import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Intervention, Machine } from '../types';
import { useAuth } from '../components/AuthContainer';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  ClipboardCheck, 
  CheckCircle2, 
  Circle,
  Activity,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      try {
        const docRef = doc(db, 'interventions', id);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as Intervention;
          setIntervention(data);
          
          // Fetch machine details
          const machineRef = doc(db, 'machines', data.machineId);
          const machineSnap = await getDoc(machineRef);
          if (machineSnap.exists()) {
            setMachine({ id: machineSnap.id, ...machineSnap.data() } as Machine);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `interventions/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Activity className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-medium">Loading report details...</p>
    </div>
  );

  if (!intervention) return (
    <div className="p-10 text-center">
      <p className="text-slate-500">Intervention not found.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-bold">Back to History</button>
    </div>
  );

  const date = intervention.timestamp?.toDate ? intervention.timestamp.toDate() : new Date(intervention.timestamp);

  // Group tasks by category
  const categories = (intervention.tasks || []).reduce((acc: any, task) => {
    const cat = task.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8 pb-20">
      <header className="space-y-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to History
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                intervention.type === 'preventive' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-orange-50 text-orange-700 border-orange-100"
              )}>
                {intervention.type} REPORT
              </span>
              <span className="text-xs font-bold text-slate-400">ID: {intervention.id?.slice(-8).toUpperCase()}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Maintenance Record</h1>
            <p className="text-xl font-bold text-slate-500 mt-1">{machine?.name || 'Loading machine...'} • {machine?.serialNumber}</p>
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <FileText size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Date Performed</span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{format(date, 'MMMM do, yyyy')}</p>
            <p className="text-sm font-medium text-slate-500">{format(date, 'HH:mm')} local time</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-400">
            <Clock size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Repair Duration</span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{intervention.durationMinutes} Minutes</p>
            <p className="text-sm font-medium text-slate-500">Active maintenance time</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-400">
            <User size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Field Technician</span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Technical Staff</p>
            <p className="text-sm font-medium text-slate-500 truncate">{intervention.technicianId?.slice(-12)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <ClipboardCheck size={24} className="text-blue-600" />
                Technical Checklist
              </h2>
              <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest leading-none">
                {intervention.tasks?.length || 0} Points Verified
              </div>
            </div>
            
            <div className="p-8 space-y-10">
              {Object.entries(categories).map(([category, tasks]: [string, any]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    {category}
                    <div className="h-[1px] flex-1 bg-slate-100" />
                  </h3>
                  <div className="grid gap-4">
                    {tasks.map((task: any) => (
                      <div key={task.taskId} className="flex items-start gap-4">
                        <div className={cn(
                          "mt-1 w-5 h-5 rounded flex items-center justify-center shrink-0",
                          task.completed ? "text-emerald-500 bg-emerald-50" : "text-slate-300 bg-slate-50"
                        )}>
                          {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-sm font-bold",
                            task.completed ? "text-slate-900" : "text-slate-400 italic"
                          )}>
                            {task.label}
                          </p>
                          {task.warning && (
                            <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 flex items-center gap-1">
                              <AlertCircle size={10} />
                              Safety Warning Acknowledged
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <FileText size={20} className="text-blue-500" />
              Technical Notes
            </h3>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <p className="text-sm font-medium text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                {intervention.notes || "No additional technical notes provided for this intervention."}
              </p>
            </div>
          </section>

          <section className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-lg font-black mb-6">Parts & Spares</h3>
            <div className="space-y-4">
              {(intervention.partsReplaced && intervention.partsReplaced.length > 0) ? (
                intervention.partsReplaced.map((part: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-bold">{part}</span>
                  </div>
                ))
              ) : (
                <p className="text-white/40 text-sm font-medium italic">No parts were replaced during this event.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
