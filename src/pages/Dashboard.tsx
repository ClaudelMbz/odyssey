import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Gauge,
  Thermometer,
  Zap,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Machine, Intervention } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../components/AuthContainer';

export default function Dashboard() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const qMachines = query(collection(db, 'machines'));
    const unsubscribeMachines = onSnapshot(qMachines, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
      setMachines(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'machines');
    });

    const qInterventions = query(
      collection(db, 'interventions'), 
      orderBy('timestamp', 'desc'), 
      limit(5)
    );
    const unsubscribeInterventions = onSnapshot(qInterventions, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
      setRecentInterventions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interventions');
    });

    return () => {
      unsubscribeMachines();
      unsubscribeInterventions();
    };
  }, [user]);

  const stats = [
    { label: 'Factory Health', value: '94%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Operating Units', value: machines.filter(m => m.status === 'running').length.toString(), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'MTBF (Avg)', value: '142h', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Alerts', value: machines.filter(m => m.status === 'failure').length.toString(), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-500 font-medium">Loading factory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Operations Control</h1>
          <p className="text-slate-500 mt-1">Real-time performance metrics for Micro-Factory unit.</p>
        </div>
        <div className="text-sm font-medium px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Live: Connected to europe-west2
        </div>
      </header>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={i} 
              variants={item}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <Icon className={stat.color} size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Health Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Gauge size={22} className="text-blue-500" />
                Line Health Status
              </h2>
              <Link to="/machines" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                Full Inventory
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {machines.slice(0, 4).map((machine) => (
                <div key={machine.id} className="p-5 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      machine.status === 'running' ? 'bg-emerald-50 text-emerald-600' : 
                      machine.status === 'failure' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    )}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{machine.name}</p>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">SN: {machine.serialNumber} • {machine.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vibration</p>
                      <p className={cn("text-sm font-black", machine.sensors.vibration > 0.8 ? 'text-rose-500' : 'text-slate-700')}>
                        {machine.sensors.vibration} <span className="text-[10px] font-medium text-slate-400">mm/s</span>
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temperature</p>
                      <p className={cn("text-sm font-black", machine.sensors.temperature > 80 ? 'text-amber-500' : 'text-slate-700')}>
                        {machine.sensors.temperature}°C
                      </p>
                    </div>
                    {machine.manualUrl && (
                      <a 
                        href={machine.manualUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors group/guide"
                        title="Maintenance Guide"
                      >
                        <BookOpen size={18} />
                      </a>
                    )}
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      machine.status === 'running' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                      machine.status === 'failure' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                    )}>
                      {machine.status}
                    </span>
                  </div>
                </div>
              ))}
              {machines.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  No machines found.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 size={22} className="text-emerald-500" />
                Intervention History
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Last {recentInterventions.length} events
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInterventions.map((log) => {
                const machine = machines.find(m => m.id === log.machineId);
                const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                
                return (
                  <div key={log.id} className="p-5 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        log.type === 'preventive' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                      )}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{log.type === 'preventive' ? 'Preventive Maintenance' : 'Corrective Action'}</p>
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">{machine?.name || 'Unknown Unit'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Performed by Technician • {log.durationMinutes} min duration
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {formatDistanceToNow(date, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {recentInterventions.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">
                  No intervention history available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Info Column */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 -mr-16 -mt-16 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <TrendingUp className="absolute -right-4 -bottom-4 text-white/5" size={160} />
            <h3 className="text-lg font-bold mb-6 relative z-10 flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              Production Metrics
            </h3>
            <div className="space-y-1 relative z-10">
              <p className="text-4xl font-black tracking-tight tracking-[-0.04em]">428.5 <span className="text-lg font-bold text-white/40">kg</span></p>
              <p className="text-blue-400 text-sm font-bold flex items-center gap-1">
                <TrendingUp size={14} />
                +12.3% <span className="text-white/40 font-medium">vs last cycle</span>
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Priority Alert</p>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Clock size={16} className="text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-bold block">Shredder S1</span>
                  <span className="text-[10px] text-white/50 font-medium">Check filter in 48h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Maintenance Outlook
            </h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-slate-700">Spare Parts Inventory</p>
                  <p className="text-xs font-black text-slate-400">82%</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '82%' }} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-slate-700">Technician Availability</p>
                  <p className="text-xs font-black text-slate-400">3/4 Active</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold transition-colors">
              Schedule Resource
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
