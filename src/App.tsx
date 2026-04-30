import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, ClipboardList, PenTool, Activity, ShieldAlert, User, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

// Import Pages
import Dashboard from './pages/Dashboard';
import MachineList from './pages/MachineList';
import MachineDetail from './pages/MachineDetail';
import InterventionForm from './pages/InterventionForm';
import InterventionHistory from './pages/InterventionHistory';
import InterventionDetail from './pages/InterventionDetail';

import { AuthProvider, useAuth } from './components/AuthContainer';

function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  
  const navItems = [
    { title: 'Dashboard', path: '/', icon: LayoutDashboard },
    { title: 'Machines', path: '/machines', icon: Activity },
    { title: 'Interventions', path: '/interventions', icon: ClipboardList },
    { title: 'Maintenance Guides', path: '/guides', icon: PenTool },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Activity className="text-white" size={24} />
        </div>
        <span className="font-bold text-lg tracking-tight">Plastic Odyssey</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400")} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all">
          <img src={user?.photoURL || ''} className="w-5 h-5 rounded-full border border-slate-700" alt="" />
          <span className="text-xs font-semibold truncate">{user?.displayName}</span>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { title: 'Dashboard', path: '/', icon: LayoutDashboard },
    { title: 'Machines', path: '/machines', icon: Activity },
    { title: 'Interventions', path: '/interventions', icon: ClipboardList },
    { title: 'Guides', path: '/guides', icon: PenTool },
  ];

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Activity className="text-blue-500" size={20} />
        <span className="font-bold text-white">PO Maintenance</span>
      </div>
      
      <button onClick={() => setIsOpen(!isOpen)} className="text-white">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <Icon size={20} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <Router basename="/odyssey">
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <Sidebar />
          <MobileNav />
          
          <main className="lg:ml-64 pt-16 lg:pt-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/machines" element={<MachineList />} />
              <Route path="/machines/:id" element={<MachineDetail />} />
              <Route path="/interventions" element={<InterventionHistory />} />
              <Route path="/interventions/:id" element={<InterventionDetail />} />
              <Route path="/interventions/new/:machineId" element={<InterventionForm />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}
