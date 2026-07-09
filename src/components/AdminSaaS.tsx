import { useState, useEffect } from 'react';
import { db } from '../db';
import { Salon, Plan } from '../types';
import { Users, Plus, Trash2, Edit2, Copy, Check, LogOut, CreditCard, BarChart2, X } from 'lucide-react';

export default function AdminSaaS({ onLogout, refreshCounter, onRefresh }: {
  onLogout: () => void;
  refreshCounter: number;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<'salons' | 'plans' | 'stats'>('salons');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showAddSalon, setShowAddSalon] = useState(false);
  const [editSalon, setEditSalon] = useState<Salon | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', store_name: '', email: '', password: '', whatsapp_number: '', plan_id: 'plan-pro' });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false); // 🔒 trava para evitar cadastro duplicado

  useEffect(() => {
    setSalons(db.getSalons());
    setPlans(db.getPlans());
  }, [refreshCounter]);

  function copyLink(salon: Salon) {
    const url = `${window.location.origin}?salonId=${salon.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(salon.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function saveSalon() {
    if (saving) return; // 🔒 se já está salvando, ignora cliques extras

    if (!form.name || !form.store_name || !form.email || !form.password) {
      setFormError('Preencha todos os campos obrigatórios.'); return;
    }

    setSaving(true); // 🔒 ativa a trava
    setFormError('');

    try {
      const all = db.getSalons();
      if (editSalon) {
        const updated = all.map(s => s.id === editSalon.id ? { ...s, ...form } : s);
        db.saveSalons(updated);
        setSuccess('Salão atualizado!');
      } else {
        // 🔒 evita duplicar salão com o mesmo e-mail
        if (all.some(s => s.email.toLowerCase() === form.email.toLowerCase())) {
          setFormError('Já existe um salão com esse e-mail.');
          setSaving(false);
          return;
        }
        const newSalon: Salon = {
          id: `salon-${Date.now()}`,
          ...form,
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          categories: ['Cabelo', 'Unhas', 'Estética'],
          working_hours: {
            seg: { open: '09:00', close: '18:00', enabled: true },
            ter: { open: '09:00', close: '18:00', enabled: true },
            qua: { open: '09:00', close: '18:00', enabled: true },
            qui: { open: '09:00', close: '18:00', enabled: true },
            sex: { open: '09:00', close: '18:00', enabled: true },
            sab: { open: '09:00', close: '13:00', enabled: true },
            dom: { open: '09:00', close: '13:00', enabled: false },
          }
        };
        db.saveSalons([...all, newSalon]);
        setSuccess(`Salão criado! Link: ${window.location.origin}?salonId=${newSalon.id}`);
      }
      setShowAddSalon(false); setEditSalon(null);
      setForm({ name: '', store_name: '', email: '', password: '', whatsapp_number: '', plan_id: 'plan-pro' });
      onRefresh();
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setSaving(false); // 🔓 libera a trava ao final
    }
  }

  function toggleStatus(salon: Salon) {
    const all = db.getSalons();
    const updated = all.map(s => s.id === salon.id
      ? { ...s, subscription_status: s.subscription_status === 'active' ? 'suspended' as const : 'active' as const }
      : s);
    db.saveSalons(updated);
    onRefresh();
  }

  function deleteSalon(id: string) {
    if (!confirm('Excluir este salão?')) return;
    db.saveSalons(db.getSalons().filter(s => s.id !== id));
    onRefresh();
  }

  const appointments = db.getAppointments();
  const totalRevenue = appointments.filter(a => a.status === 'completed').reduce((s, a) => s + a.service_price, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-base">✂️</div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">Central de Agendamento</h1>
            <p className="text-[10px] text-neutral-500">Painel Admin SaaS</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-neutral-500 hover:text-white transition p-1.5">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-900/50">
        {[
          { label: 'Salões', value: salons.length, color: 'text-pink-400' },
          { label: 'Ativos', value: salons.filter(s => s.subscription_status === 'active').length, color: 'text-green-400' },
          { label: 'Agendamentos', value: appointments.length, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-900 rounded-xl p-3 text-center border border-neutral-800">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {success && (
        <div className="mx-3 mt-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-xs break-all">
          ✅ {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 px-3 mt-2">
        {[['salons','Salões'],['plans','Planos'],['stats','Relatório']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${tab === key ? 'border-pink-500 text-pink-400' : 'border-transparent text-neutral-500'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 pb-20">
        {tab === 'salons' && (
          <div className="space-y-3">
            <button onClick={() => { setShowAddSalon(true); setEditSalon(null); setForm({ name:'',store_name:'',email:'',password:'',whatsapp_number:'',plan_id:'plan-pro'}); }}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition">
              <Plus className="w-4 h-4" /> Cadastrar Novo Salão
            </button>

            {salons.map(salon => (
              <div key={salon.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate">{salon.store_name}</h3>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${salon.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {salon.subscription_status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{salon.email}</p>
                    <p className="text-[11px] text-neutral-500">{salon.name}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => { setEditSalon(salon); setForm({ name: salon.name, store_name: salon.store_name, email: salon.email, password: salon.password || '', whatsapp_number: salon.whatsapp_number || '', plan_id: salon.plan_id }); setShowAddSalon(true); }}
                      className="p-1.5 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition">
                      <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                    <button onClick={() => deleteSalon(salon.id)}
                      className="p-1.5 bg-neutral-800 rounded-lg hover:bg-red-900/40 transition">
                      <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyLink(salon)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded-xl text-xs font-bold transition active:scale-95">
                    {copiedId === salon.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === salon.id ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button onClick={() => toggleStatus(salon)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${salon.subscription_status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {salon.subscription_status === 'active' ? 'Suspender' : 'Ativar'}
                  </button>
                </div>
                <div className="text-[10px] text-neutral-600 break-all">{window.location.origin}?salonId={salon.id}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'plans' && (
          <div className="space-y-3">
            {plans.map(plan => (
              <div key={plan.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{plan.name}</h3>
                  <span className="text-pink-400 font-black text-sm">R$ {plan.price.toFixed(2)}<span className="text-neutral-500 text-[10px] font-normal">/{plan.interval}</span></span>
                </div>
                <ul className="mt-2 space-y-1">
                  {plan.features.map(f => <li key={f} className="text-[11px] text-neutral-400 flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Receita Total</h3>
              <div className="text-3xl font-black text-green-400">R$ {totalRevenue.toFixed(2)}</div>
              <p className="text-[11px] text-neutral-500 mt-1">de agendamentos concluídos</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-white mb-3">Agendamentos por Status</h3>
              {(['pending','confirmed','completed','cancelled'] as const).map(status => {
                const count = appointments.filter(a => a.status === status).length;
                const labels = { pending: 'Pendentes', confirmed: 'Confirmados', completed: 'Concluídos', cancelled: 'Cancelados' };
                const colors = { pending: 'text-yellow-400', confirmed: 'text-blue-400', completed: 'text-green-400', cancelled: 'text-red-400' };
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-xs text-neutral-400">{labels[status]}</span>
                    <span className={`text-sm font-black ${colors[status]}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Salon Modal */}
      {showAddSalon && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <h2 className="font-black text-white">{editSalon ? 'Editar Salão' : 'Novo Salão'}</h2>
              <button onClick={() => { setShowAddSalon(false); setEditSalon(null); }} className="p-1.5 hover:bg-neutral-800 rounded-lg transition"><X className="w-4 h-4 text-neutral-400" /></
