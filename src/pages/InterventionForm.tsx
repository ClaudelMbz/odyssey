import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Machine, MaintenanceTask } from '../types';
import { useAuth } from '../components/AuthContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ArrowLeft, Save, AlertTriangle, AlertCircle, Camera, ClipboardList, Clock, Wrench, Loader2, BookOpen, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '../lib/utils';

const DEFAULT_GUIDES: Record<string, { label: string; category?: string; warning?: string }[]> = {
  shredder: [
    // Safety Protocol
    { label: 'E-LOTO: Power Off & Emergency Stop engaged', category: 'Safety Protocol', warning: 'MANDATORY' },
    { label: 'E-LOTO: Mechanical switch locked with padlock', category: 'Safety Protocol' },
    { label: 'E-LOTO: Voltage Absence Test (VAT) on all conductors', category: 'Safety Protocol', warning: 'Check neutral as well' },
    { label: 'M-LOTO: Rotors and fans completely stopped', category: 'Safety Protocol' },
    { label: 'M-LOTO: Belts uncoupled & Rotor mechanically blocked', category: 'Safety Protocol' },
    { label: 'M-LOTO: Visual check of dissipation & immobilization', category: 'Safety Protocol' },
    
    // Daily Maintenance
    { label: 'Daily: General inspection and wear search', category: 'Maintenance' },
    { label: 'Hopper: Closure and sensor operation check', category: 'Maintenance' },
    { label: 'Rotor: Visual check of blades and counter-blades', category: 'Maintenance' },
    { label: 'Protection: Transmission housing positioning check', category: 'Maintenance' },
    { label: 'Safety: Emergency Stop accessibility check', category: 'Maintenance' },
    
    // Cleaning
    { label: 'Clean: General workplace & collection bin', category: 'Cleaning' },
    { label: 'Clean: Hopper impurities removal', category: 'Cleaning' },
    { label: 'Clean: Blades & mesh screen cleaning', category: 'Cleaning' },
    { label: 'Clean: Motor ventilation (Monthly)', category: 'Cleaning' },
    
    // Periodic
    { label: 'Weekly: Tightness check of screws and nuts', category: 'Periodic' },
    { label: 'Weekly: E-Stop functional test', category: 'Periodic' },
    { label: 'Monthly: Bearing lubrication & belt tension check', category: 'Periodic' },
    { label: 'Monthly: Blade sharpening & gap adjustment', category: 'Periodic' },
    { label: 'Yearly: Replacement of blades & counter-blades', category: 'Periodic' }
  ],
  extruder: [
    { label: 'Verify heating zone temperatures (180-210°C)', category: 'Operation' },
    { label: 'Clean die head and remove burnt plastic', category: 'Cleaning' },
    { label: 'Check screw wear and gearbox lubrication', category: 'Maintenance' },
    { label: 'Inspect motor cooling fan operation', category: 'Maintenance' },
    { label: 'Calibrate temperature sensors', category: 'Maintenance' }
  ]
};

const MANUAL_URLS: Record<string, string> = {
  shredder: 'https://technology.plasticodyssey.org/broyeur-recyclage-plastique/#maintenance',
  extruder: 'https://technology.plasticodyssey.org/extrudeuse-recyclage/#maintenance'
};

export default function InterventionForm() {
  const { user } = useAuth();
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [tasks, setTasks] = useState<(MaintenanceTask & { warning?: string })[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!machineId || !user) return;

    const fetchMachine = async () => {
      const docRef = doc(db, 'machines', machineId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Machine;
        setMachine({ id: docSnap.id, ...data });
        
        // Load default tasks based on machine type
        const guideTasks = DEFAULT_GUIDES[data.type] || [{ label: 'General inspection' }];
        setTasks(guideTasks.map((t, i) => ({
          taskId: `task-${i}`,
          label: t.label,
          category: t.category,
          warning: t.warning,
          completed: false
        })));
      }
      setLoading(false);
    };

    fetchMachine();
  }, [machineId, user]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.taskId === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!machineId || !user || saving) return;

    setSaving(true);
    try {
      // Save Intervention
      await addDoc(collection(db, 'interventions'), {
        machineId,
        technicianId: user.uid,
        type: 'preventive',
        timestamp: serverTimestamp(),
        tasks: tasks.map(({ taskId, label, completed, category }) => ({ taskId, label, completed, category })),
        notes,
        durationMinutes: parseInt(duration),
        partsReplaced: []
      });

      // Update machine last maintenance
      await updateDoc(doc(db, 'machines', machineId), {
        lastMaintenance: serverTimestamp(),
        status: 'running' 
      });

      navigate(`/machines/${machineId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `interventions / machine: ${machineId}`);
    } finally {
      setSaving(false);
    }
  };

  const categories = tasks.reduce((acc, task) => {
    const cat = task.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0;

  if (loading) return (
    <div className="p-10 flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-medium">Loading maintenance protocol...</p>
    </div>
  );

  if (!machine) return <div className="p-10 text-center">Machine not found.</div>;

  return (
    <div className="p-4 lg:p-10 max-w-3xl mx-auto space-y-8 pb-32">
      <header className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Cancel Intervention
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <ClipboardList size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-none">New Intervention</h1>
            <p className="text-slate-500 font-medium mt-2">{machine.name} • {machine.serialNumber}</p>
          </div>
          {MANUAL_URLS[machine.type] && (
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => setShowQR(!showQR)}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2"
                title="Show QR Code"
              >
                <QrCode size={20} />
              </button>
              <a 
                href={MANUAL_URLS[machine.type]}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-white hover:bg-slate-800 hover:shadow-md transition-all flex items-center gap-2"
              >
                <BookOpen size={20} />
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Guide</span>
              </a>
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {showQR && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100">
                  <QRCodeCanvas value={MANUAL_URLS[machine.type]} size={180} level="H" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">Scan for Maintenance Information</p>
                  <p className="text-sm font-medium text-slate-500">Instant access to technical guides on your mobile device</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Protocol Progress</span>
          <span className="text-xl font-black text-blue-600">{progress}%</span>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Checklist */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Wrench size={24} className="text-blue-500" />
              Technical Checklist
            </h2>
            <div className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-widest leading-none">
              {tasks.length} Checkpoints
            </div>
          </div>
          
          <div className="space-y-10">
            {Object.entries(categories).map(([category, catTasks]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] flex-1 bg-slate-100" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {category}
                  </h3>
                  <div className="h-[2px] flex-1 bg-slate-100" />
                </div>
                
                <div className="grid gap-3">
                  {(catTasks as any[]).map((task) => (
                    <div 
                      key={task.taskId}
                      className={cn(
                        "flex flex-col p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                        category === 'Safety Protocol' && !task.completed ? "border-rose-200 bg-rose-50/10" : "",
                        task.completed 
                          ? "bg-blue-50/50 border-blue-200 shadow-inner" 
                          : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
                      )}
                      onClick={() => toggleTask(task.taskId)}
                    >
                      {category === 'Safety Protocol' && !task.completed && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -mr-8 -mt-8" />
                      )}
                      <div className="flex items-center gap-4 relative z-10">
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
                            task.completed 
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                              : category === 'Safety Protocol' 
                                ? "border-rose-300 text-transparent group-hover:border-rose-400"
                                : "border-slate-300 text-transparent group-hover:border-blue-400"
                          )}
                        >
                          <CheckCircle2 size={18} className={task.completed ? "scale-100" : "scale-0"} />
                        </div>
                        <div className="flex-1">
                          <span className={cn(
                            "text-base font-bold transition-all",
                            task.completed ? "text-blue-900" : "text-slate-700",
                            category === 'Safety Protocol' && !task.completed ? "text-rose-900" : ""
                          )}>
                            {task.label}
                          </span>
                        </div>
                      </div>
                      {task.warning && (
                        <div className={cn(
                          "mt-3 ml-12 px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-2 border uppercase tracking-tight relative z-10",
                          category === 'Safety Protocol' 
                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          <AlertCircle size={14} />
                          {task.warning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notes & details */}
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} />
              Duration (minutes)
            </label>
            <input 
              type="number" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none focus:border-blue-500 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Technician Notes</label>
            <textarea 
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any anomalies, parts replaced, or general observations..."
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-blue-100 transition-all outline-none focus:border-blue-500 text-lg"
            />
          </div>

          <button className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all">
            <Camera size={24} />
            Attach Evidence Photos
          </button>
        </section>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 lg:left-64 z-40 bg-opacity-80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={progress < 100 || saving}
              className={cn(
                "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                progress < 100 
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95"
              )}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
              {progress < 100 ? `Complete All Tasks (${tasks.filter(t => t.completed).length}/${tasks.length})` : 'Finalize & Upload Record'}
            </button>
          </div>
        </div>
      </form>
      
      {progress < 100 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <p className="text-sm font-bold text-amber-800 leading-tight">
            Security Constraint: You must validate all checklist items before submitting this intervention report.
          </p>
        </div>
      )}
    </div>
  );
}
