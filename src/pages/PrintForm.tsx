import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Machine } from '../types';
import { useAuth } from '../components/AuthContainer';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Box, 
  Clock, 
  Layers, 
  Loader2,
  Trash2,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function PrintForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [partName, setPartName] = useState('');
  const [machineId, setMachineId] = useState('');
  const [material, setMaterial] = useState('PET');
  const [estimatedDuration, setEstimatedDuration] = useState('120');

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const q = query(collection(db, 'machines'));
        const snap = await getDocs(q);
        setMachines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'machines');
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !machineId || !partName) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'prints'), {
        partName,
        machineId,
        material,
        technicianId: user.uid,
        timestamp: serverTimestamp(),
        status: 'printing',
        estimatedDuration: parseInt(estimatedDuration)
      });
      navigate('/repair-shop');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prints');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-bold">Initializing workshop...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Cancel Print
        </button>
        <button 
          form="print-form"
          disabled={saving || !partName || !machineId}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:grayscale"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? 'LAUNCHING...' : 'START PRINTING'}
        </button>
      </header>

      <section className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">New Repair Part</h1>
        <p className="text-lg font-bold text-slate-400">Configure parameters for 3D part production</p>
      </section>

      <form id="print-form" onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
          {/* Part Name */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              <Box size={14} className="text-blue-500" />
              Part Designation
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Shredder Drive Cog v2.1"
              className="w-full bg-slate-50 border-0 rounded-2xl py-5 px-6 font-bold text-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Target Machine */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                <Printer size={14} className="text-blue-500" />
                Target Machine
              </label>
              <select 
                required
                className="w-full bg-slate-50 border-0 rounded-2xl py-5 px-6 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
              >
                <option value="">Select equipment...</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.serialNumber})</option>
                ))}
              </select>
            </div>

            {/* Material */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                <Layers size={14} className="text-blue-500" />
                Raw Material
              </label>
              <select 
                required
                className="w-full bg-slate-50 border-0 rounded-2xl py-5 px-6 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option value="PET">Recycled PET (Bottle grade)</option>
                <option value="HDPE">High-Density Polyethylene</option>
                <option value="LDPE">Low-Density Polyethylene</option>
                <option value="PP">Polypropylene</option>
                <option value="PETG">PETG (Engineering grade)</option>
                <option value="ABS">ABS (Industrial strength)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              <Clock size={14} className="text-blue-500" />
              Estimated Print Time (Minutes)
            </label>
            <div className="flex items-center gap-6">
              <input 
                type="range"
                min="10"
                max="1440"
                step="10"
                className="flex-1 accent-blue-600"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              />
              <div className="w-24 text-right font-black text-2xl text-slate-900 leading-none">
                {Math.floor(parseInt(estimatedDuration)/60)}h {parseInt(estimatedDuration)%60}m
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              <span>Quick Fix (10m)</span>
              <span>24h Max Production</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100 flex gap-6">
          <div className="p-3 bg-amber-500 text-white rounded-2xl h-fit">
            <Printer size={24} />
          </div>
          <div>
            <h4 className="text-amber-900 font-black mb-1 italic">Technician Protocol</h4>
            <p className="text-sm font-bold text-amber-700 leading-relaxed">
              Before launching production, verify the 3D printer bed adhesion and ensure sufficient filament supply. 
              Always check the STL orientation for optimal structural integrity of the final mechanical part.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
