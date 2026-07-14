import { useState, useEffect } from 'react';
import { db } from '../db';
import { Salon, Plan } from '../types';
import { Users, Plus, Trash2, Edit2, Copy, Check, LogOut, CreditCard, BarChart2, X, Eye } from 'lucide-react';

export default function AdminSaaS({ onLogout, refreshCounter, onRefresh, isClientPanel = false }: {
  onLogout: () => void;
  refreshCounter: number;
  onRefresh: () => void;
  isClientPanel?: boolean;
}) {
  const [tab, setTab] = useState<'salons' | 'plans' | 'stats'>('salons');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showAddSalon, setShowAddSalon] = useState(false);
  const [editSalon, setEditSalon] = useState<Salon | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPanelId, setCopiedPanelId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', store_name: '', email: '', password: '', whatsapp_number: '', plan_id: 'plan-pro' });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false); // 🔒 trava para evitar cadastro duplicado
  const [salonToDelete, setSalonToDelete] = useState<Salon | null>(null);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [renewalDates, setRenewalDates] = useState<Record<string, string>>({});

  function activateSalonWithDate(salon: Salon, dateStr: string) {
    if (!dateStr) {
      alert('Por favor, selecione uma data de renovação.');
      return;
    }
    // Adiciona 30 dias a partir do dia preenchido da renovação
    const baseDate = new Date(dateStr + 'T12:00:00'); // Evita problemas de fuso horário
    baseDate.setDate(baseDate.getDate() + 30);
    const newDateStr = baseDate.toISOString().split('T')[0];

    const updated = salons.map(s => s.id === salon.id ? { 
      ...s, 
      next_payment_date: newDateStr,
      payment_status: 'active' as const
    } : s);
    db.saveSalons(updated);
    setSalons(updated);
    onRefresh();
  }

  function handleSavePlanPrice(planId: string) {
    const priceNum = parseFloat(editPriceValue);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor, insira um preço válido.');
      return;
    }
    const updated = plans.map(p => p.id === planId ? { ...p, price: priceNum } : p);
    db.savePlans(updated);
    setPlans(updated);
    setEditingPlanId(null);
    onRefresh();
  }

  function renewSalon30Days(salon: Salon) {
    const today = new Date();
    let baseDate = new Date();
    if (salon.next_payment_date) {
      const currentNext = new Date(salon.next_payment_date);
      if (currentNext > today) {
        baseDate = currentNext;
      }
    }
    baseDate.setDate(baseDate.getDate() + 30);
    const newDateStr = baseDate.toISOString().split('T')[0];
    
    const updated = salons.map(s => s.id === salon.id ? { 
      ...s, 
      next_payment_date: newDateStr,
      payment_status: 'active' as const
    } : s);
    db.saveSalons(updated);
    onRefresh();
  }

  function setSalonPaymentStatus(salon: Salon, status: 'active' | 'overdue') {
    const updated = salons.map(s => {
      if (s.id === salon.id) {
        const patch: Partial<Salon> = { payment_status: status };
        if (status === 'active' && (!s.next_payment_date || s.next_payment_date < new Date().toISOString().split('T')[0])) {
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          patch.next_payment_date = thirtyDaysFromNow.toISOString().split('T')[0];
        } else if (status === 'overdue') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          patch.next_payment_date = yesterday.toISOString().split('T')[0];
        }
        return { ...s, ...patch };
      }
      return s;
    });
    db.saveSalons(updated);
    onRefresh();
  }

  useEffect(() => {
    // FIX: Dedup salões por id na exibição — última linha de defesa
    const raw = db.getSalons();
    const seen = new Set<string>();
    setSalons(raw.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }));
    setPlans(db.getPlans());
  }, [refreshCounter]);

  function copyLink(salon: Salon) {
    const url = `${window.location.origin}?salonId=${salon.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(salon.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function copyPanelLink(salon: Salon) {
    const url = `${window.location.origin}?salonId=${salon.id}&panel=true`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPanelId(salon.id);
      setTimeout(() => setCopiedPanelId(null), 2000);
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
        setSuccess('Cliente atualizado!');
      } else {
        // 🔒 evita duplicar salão com o mesmo e-mail
        if (all.some(s => s.email.toLowerCase() === form.email.toLowerCase())) {
          setFormError('Já existe um cliente com esse e-mail.');
          setSaving(false);
          return;
        }
        const newSalon: Salon = {
          id: `salon-${Date.now()}`,
          ...form,
          subscription_status: 'active',
          payment_status: 'active',
          next_payment_date: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d.toISOString().split('T')[0];
          })(),
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
        setSuccess(`Cliente criado! Link: ${window.location.origin}?salonId=${newSalon.id}`);
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

  function confirmDeleteSalon(id: string) {
    const updated = salons.filter(s => s.id !== id);
    db.saveSalons(updated);
    setSalons(updated);
    setSalonToDelete(null);
    onRefresh();
  }

  const appointments = db.getAppointments();
  const totalRevenue = appointments.filter(a => a.status === 'completed').reduce((s, a) => s + a.service_price, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-base">📅</div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">
              {isClientPanel ? 'Painel do Cliente' : 'Agenda Onzap Flow'}
            </h1>
            <p className="text-[10px] text-neutral-500">
              {isClientPanel ? 'Gestão de Clientes e Lojas' : 'Painel Admin SaaS'}
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="text-neutral-500 hover:text-white transition p-1.5">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-900/50">
        {[
          { label: 'Clientes', value: salons.length, color: 'text-red-400' },
          { label: 'Ativos', value: salons.filter(s => s.subscription_status === 'active').length, color: 'text-green-400' },
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
        {[['salons','Clientes'],['plans','Planos']]
          .filter(([key]) => !isClientPanel || key !== 'plans')
          .map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${tab === key ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-500'}`}>
              {label}
            </button>
          ))}
      </div>

      <div className="p-3 pb-20">
        {tab === 'salons' && (
          <div className="space-y-3">
            <button onClick={() => { setShowAddSalon(true); setEditSalon(null); setForm({ name:'',store_name:'',email:'',password:'',whatsapp_number:'',plan_id:'plan-pro'}); }}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition">
              <Plus className="w-4 h-4" /> Cadastrar Cliente
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
                    <button onClick={() => setSalonToDelete(salon)}
                      className="p-1.5 bg-neutral-800 rounded-lg hover:bg-red-900/40 transition">
                      <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => copyPanelLink(salon)}
                    className="flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded-xl text-[10px] font-bold transition active:scale-95">
                    {copiedPanelId === salon.id ? <Check className="w-3 h-3 text-green-400" /> : <Eye className="w-3 h-3 text-red-400" />}
                    {copiedPanelId === salon.id ? 'Copiado!' : 'Painel Loja'}
                  </button>
                  <button onClick={() => toggleStatus(salon)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition active:scale-95 ${salon.subscription_status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {salon.subscription_status === 'active' ? 'Suspender' : 'Ativar'}
                  </button>
                </div>
                <div className="space-y-1 mt-1 bg-neutral-950/40 p-2 rounded-xl border border-neutral-800/40">
                  <div className="flex items-center justify-between text-[10px] gap-2">
                    <span className="text-neutral-500 uppercase font-bold shrink-0">Painel Loja:</span>
                    <a href={`${window.location.origin}?salonId=${salon.id}&panel=true`} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline truncate">
                      {window.location.origin}?salonId={salon.id}&panel=true
                    </a>
                  </div>
                </div>

                {/* Controle de Cobrança e Renovação */}
                <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold">Cobrança e Renovação</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      (salon.payment_status === 'overdue' || (salon.next_payment_date && new Date().toISOString().split('T')[0] > salon.next_payment_date))
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {(salon.payment_status === 'overdue' || (salon.next_payment_date && new Date().toISOString().split('T')[0] > salon.next_payment_date))
                        ? 'Atrasado'
                        : 'Ativo'
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-neutral-300">
                    <span>Próximo Vencimento:</span>
                    <span className="font-mono text-neutral-400 font-bold">
                      {salon.next_payment_date 
                        ? new Date(salon.next_payment_date + 'T00:00:00').toLocaleDateString('pt-BR')
                        : 'Não definido'}
                    </span>
                  </div>

                  {/* Preencher Dia que Renovou / Primeira Ativação */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
                    <label className="text-[9px] text-neutral-400 uppercase font-black block">Dia que Renovou / Ativou:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={renewalDates[salon.id] || new Date().toISOString().split('T')[0]}
                        onChange={e => setRenewalDates({ ...renewalDates, [salon.id]: e.target.value })}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-red-500 font-mono"
                      />
                      <button
                        onClick={() => activateSalonWithDate(salon, renewalDates[salon.id] || new Date().toISOString().split('T')[0])}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-[10px] whitespace-nowrap transition active:scale-95 flex items-center gap-1 shadow-md"
                      >
                        Ativar
                      </button>
                    </div>
                  </div>

                  {/* Outros controles manuais */}
                  <div className="flex gap-1.5 pt-1.5 border-t border-neutral-800/40">
                    <button
                      onClick={() => renewSalon30Days(salon)}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-1 px-1.5 rounded-lg text-[9px] transition"
                      title="Adiciona +30 dias ao vencimento atual"
                    >
                      +30 Dias (Adiar)
                    </button>
                    <button
                      onClick={() => setSalonPaymentStatus(salon, 'active')}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-bold py-1 px-1.5 rounded-lg text-[9px] transition"
                    >
                      Marcar Ativo
                    </button>
                    <button
                      onClick={() => setSalonPaymentStatus(salon, 'overdue')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-1 px-1.5 rounded-lg text-[9px] transition"
                    >
                      Marcar Atrasado
                    </button>
                  </div>
                </div>
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
                  <div className="text-right">
                    <span className="text-red-400 font-black text-sm block">R$ {plan.price.toFixed(2)}<span className="text-neutral-500 text-[10px] font-normal">/{plan.interval}</span></span>
                    {editingPlanId === plan.id ? (
                      <div className="flex items-center gap-1 mt-1.5 justify-end">
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceValue}
                          onChange={e => setEditPriceValue(e.target.value)}
                          className="w-20 bg-neutral-800 text-white border border-neutral-700 rounded px-1.5 py-0.5 text-xs outline-none focus:border-red-500"
                        />
                        <button
                          onClick={() => handleSavePlanPrice(plan.id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingPlanId(null)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded text-[10px]"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPlanId(plan.id);
                          setEditPriceValue(plan.price.toString());
                        }}
                        className="text-[10px] text-neutral-400 hover:text-white underline mt-1 block ml-auto"
                      >
                        Alterar Valor
                      </button>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {plan.features.map(f => <li key={f} className="text-[11px] text-neutral-400 flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Salon Modal */}
      {showAddSalon && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="admin_saas_modal_overlay">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" id="admin_saas_modal">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <h2 className="font-black text-white">{editSalon ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => { setShowAddSalon(false); setEditSalon(null); }} className="p-1.5 hover:bg-neutral-800 rounded-lg transition"><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                  ⚠️ {formError}
                </div>
              )}
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Nome do Salão/Negócio *</label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={e => setForm({ ...form, store_name: e.target.value })}
                  placeholder="Ex: Salão Beleza Pura"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Nome do Responsável *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!editSalon}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@salao.com"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Senha *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">WhatsApp (DDD + Número)</label>
                <input
                  type="text"
                  value={form.whatsapp_number}
                  onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="Ex: 11999999999"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Plano Assinado</label>
                <select
                  value={form.plan_id}
                  onChange={e => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 transition"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2">
                <button
                  onClick={saveSalon}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl text-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de diálogo para confirmação de exclusão do cliente */}
      {salonToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500 text-lg">⚠️</div>
              <h3 className="text-white font-bold text-sm">Excluir Cliente</h3>
              <p className="text-xs text-neutral-400 leading-normal">
                Deseja excluir o cliente <strong className="text-white">{salonToDelete.store_name}</strong>?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSalonToDelete(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded-xl text-xs font-bold transition active:scale-95 border border-neutral-700/50"
              >
                Não
              </button>
              <button
                onClick={() => confirmDeleteSalon(salonToDelete.id)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-red-600/20"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
