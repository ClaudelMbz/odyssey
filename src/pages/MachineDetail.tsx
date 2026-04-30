import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Machine, Intervention } from '../types';
import { useAuth } from '../components/AuthContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Settings, 
  History, 
  Wrench, 
  AlertTriangle,
  Clock,
  Zap,
  Thermometer,
  Activity,
  ChevronRight,
  ShieldCheck,
  Calendar,
  FlameKindling,
  BookOpen,
  QrCode
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
// ... rest of imports
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function MachineDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // Mock chart data - ideally this would come from a subcollection of time-series data
  const chartData = [
    { time: '10:00', temp: 180, vibration: 0.12 },
    { time: '11:00', temp: 185, vibration: 0.15 },
    { time: '12:00', temp: 192, vibration: 0.22 },
    { time: '13:00', temp: 195, vibration: 0.18 },
    { time: '14:00', temp: 190, vibration: 0.14 },
    { time: '15:00', temp: 198, vibration: 0.28 },
    { time: '16:00', temp: 202, vibration: 0.35 },
  ];

  useEffect(() => {
    if (!id || !user) return;

    const unsubMachine = onSnapshot(doc(db, 'machines', id), (doc) => {
      if (doc.exists()) {
        setMachine({ id: doc.id, ...doc.data() } as Machine);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `machines/${id}`);
    });

    const qInterventions = query(
      collection(db, 'interventions'),
      where('machineId', '==', id),
      orderBy('timestamp', 'desc')
    );

    const unsubInterventions = onSnapshot(qInterventions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
      setInterventions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interventions');
    });

    return () => {
      unsubMachine();
      unsubInterventions();
    };
  }, [id, user]);

  const simulateAnomaly = async () => {
    if (!id || !machine) return;
    try {
      await updateDoc(doc(db, 'machines', id), {
        status: 'failure',
        'sensors.vibration': 1.4,
        'sensors.temperature': 98
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `machines/${id}`);
    }
  };

  const recoverMachine = async () => {
    if (!id || !machine) return;
    try {
      await updateDoc(doc(db, 'machines', id), {
        status: 'running',
        'sensors.vibration': 0.12,
        'sensors.temperature': 39
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `machines/${id}`);
    }
  };

  if (loading) return (
// ... rest of code
    <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Activity className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-medium">Synchronizing machine telemetry...</p>
    </div>
  );

  if (!machine) return (
    <div className="p-10 text-center">
      <h2 className="text-2xl font-bold text-slate-900">Machine not found</h2>
      <Link to="/machines" className="text-blue-600 hover:underline mt-4 inline-block">Return to inventory</Link>
    </div>
  );

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4">
          <Link to="/machines" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Inventory
          </Link>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl",
              machine.status === 'running' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}>
              <Activity size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{machine.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold text-slate-400">SN: {machine.serialNumber}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    machine.status === 'running' ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                  {machine.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {machine.manualUrl && (
            <>
              <button 
                onClick={() => setShowQR(!showQR)}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-md transition-all"
                title="Scan QR Code"
              >
                <QrCode size={20} />
              </button>
              <a 
                href={machine.manualUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all hover:shadow-lg hover:shadow-slate-200/50"
              >
                <BookOpen size={20} className="text-blue-500" />
                Maintenance Guide
              </a>
            </>
          )}
          <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:shadow-md transition-all">
            <Settings size={20} />
          </button>
          <Link 
            to={`/interventions/new/${machine.id}`}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-900/20 font-bold hover:bg-blue-700 transition-all active:scale-95"
          >
            <Wrench size={20} />
            Start Intervention
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showQR && machine.manualUrl && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row items-center gap-10 text-center md:text-left shadow-2xl relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />
              <div className="p-6 bg-white rounded-3xl shadow-2xl shadow-blue-500/20 relative z-10">
                <QRCodeCanvas value={machine.manualUrl} size={200} level="H" />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest">
                  <QrCode size={14} />
                  Technician Quick Access
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">Mobile Maintenance Guide</h3>
                <p className="text-slate-400 font-medium text-lg max-w-md leading-relaxed">
                  Scan this code with a mobile device to instantly access the {machine.type} maintenance procedures and safety protocols on the factory floor.
                </p>
                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Verified Official Source
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Sensors Status Header - Inspired by reference image */}
      <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px]" />
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
            <Activity size={14} />
            SIMULATED SENSOR STATUS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Temperature</p>
              <p className={cn("text-4xl font-black", machine.sensors.temperature > 80 ? "text-rose-400" : "text-white")}>
                {machine.sensors.temperature}°C
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", machine.sensors.temperature > 80 ? "bg-rose-500 animate-ping" : "bg-emerald-500")} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {machine.sensors.temperature > 80 ? "High Temperature" : "Temperature OK"}
                </span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Vibration</p>
                <p className={cn("text-3xl font-black uppercase italic", machine.sensors.vibration > 0.6 ? "text-rose-400" : "text-white")}>
                  {machine.sensors.vibration > 0.6 ? "Critical" : "Normal"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", machine.sensors.vibration > 0.6 ? "bg-rose-500 animate-ping" : "bg-emerald-500")} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">
                    {machine.sensors.vibration > 0.6 ? "Excessive Vibration" : "Vibration Stable"}
                  </span>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hours Since Maintenance</p>
                <p className="text-4xl font-black text-white">146h</p>
                <div className="mt-4 flex items-center gap-2">
                  <Clock size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Last service: 3 weeks ago</span>
                </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-8">
            {machine.status !== 'failure' ? (
              <button 
                onClick={simulateAnomaly}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-900/40"
              >
                <Zap size={18} />
                Simulate Anomaly
              </button>
            ) : (
                <button 
                  onClick={recoverMachine}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/40"
                >
                  <Activity size={18} />
                  Restore Normal Operation
                </button>
            )}

            {machine.manualUrl && (
              <a 
                href={machine.manualUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-slate-400 hover:text-blue-400 font-bold transition-all group/guide"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/guide:bg-blue-500/20 group-hover/guide:border-blue-500/50 transition-all">
                  <BookOpen size={18} className="text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/guide:text-blue-400">Documentation</span>
                  <span className="text-sm font-black">Guide Link</span>
                </div>
              </a>
            )}
          </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Real-time Analytics */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900">Performance Telemetry</h3>
                <p className="text-sm text-slate-400 font-medium tracking-tight">Last 6 hours of sensor data streaming.</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                {['1H', '6H', '24H', '7D'].map(t => (
                  <button key={t} className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black transition-all",
                    t === '6H' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">MTBF</p>
                <p className="text-2xl font-black text-slate-900 mt-1">162 Hours</p>
                <p className="text-[11px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Within Specs
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <ShieldCheck size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Service</p>
                <p className="text-2xl font-black text-slate-900 mt-1">12 May 2026</p>
                <p className="text-[11px] text-amber-500 font-bold mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  Scheduled soon
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                <Calendar size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* History Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <History size={18} className="text-blue-500" />
                Event Logs
              </h3>
              <button className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">
                Export Logs
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-6">
              <div className="space-y-8 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100" />
                {interventions.map((log) => (
                  <div key={log.id} className="relative pl-10">
                    <div className={cn(
                      "absolute left-0 top-0 w-5 h-5 rounded-full border-4 border-white z-10",
                      log.type === 'preventive' ? 'bg-emerald-500' : 'bg-amber-500'
                    )} />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        {format(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp), 'MMM d, yyyy • HH:mm')}
                      </p>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {log.type === 'preventive' ? 'Preventive Maintenance' : 'Machine Repair'}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2">
                        {log.notes || 'Routine check of all components completed successfully.'}
                      </p>
                      <div className="flex gap-2 pt-2">
                        {log.tasks?.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {interventions.length === 0 && (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <History size={32} />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No history found for this unit.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
