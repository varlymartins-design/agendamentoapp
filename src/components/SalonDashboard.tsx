import { useState, useEffect } from 'react';
import { db } from '../db';
import { Salon, Service, Professional, Appointment } from '../types';
import { Calendar, Scissors, Users, Settings, LogOut, Plus, Trash2, Edit2, X, Check, Copy, Clock, ChevronRight, Star, Eye } from 'lucide-react';

const DAYS = ['seg','ter','qua','qui','sex','sab','dom'];
const DAY_LABELS: Record<string,string> = { seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex',sab:'Sáb',dom:'Dom' };
const STATUS_LABEL: Record<string,string> = { pending:'Pendente', confirmed:'Confirmado', completed:'Concluído', cancelled:'Cancelado' };
const STATUS_COLOR: Record<string,string> = { pending:'text-yellow-400 bg-yellow-400/10', confirmed:'text-blue-400 bg-blue-400/10', completed:'text-green-400 bg-green-400/10', cancelled:'text-red-400 bg-red-400/10' };

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SalonDashboard({ salonId, onLogout, refreshCounter, onRefresh }: {
  salonId: string; onLogout: () => void; refreshCounter: number; onRefresh: () => void;
}) {
  const [tab, setTab] = useState<'agenda'|'servicos'|'profissionais'|'vitrine'|'configuracoes'>('agenda');
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = db.getSalons().find(s => s.id === salonId) || null;
    setSalon(s);
    setServices(db.getServices().filter(s => s.salon_id === salonId));
    setProfessionals(db.getProfessionals().filter(p => p.salon_id === salonId));
    setAppointments(db.getAppointments().filter(a => a.salon_id === salonId));
  }, [salonId, refreshCounter]);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}?salonId=${salonId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const todayStr = getLocalDateString();
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  if (!salon) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Carregando...</div>;

  const isOverdue = salon.payment_status === 'overdue' || (salon.next_payment_date && getLocalDateString() > salon.next_payment_date);

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          {salon.store_logo
            ? <img src={salon.store_logo} className="w-8 h-8 rounded-xl object-cover" />
            : <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-base">📅</div>}
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate leading-none">{salon.store_name}</h1>
            <p className="text-[10px] text-neutral-500">Painel de Agendamento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-bold px-2.5 py-1.5 rounded-lg transition active:scale-95">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Link'}</span>
          </button>
          <button onClick={onLogout} className="p-1.5 text-neutral-500 hover:text-white transition"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Demonstrativo de Status de Assinatura */}
      <div className="px-3 pt-3">
        {isOverdue ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-red-400 font-black text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                ⚠️ Assinatura em Atraso
              </div>
              <p className="text-[10px] text-neutral-400 leading-normal">
                Identificamos uma pendência financeira na mensalidade da plataforma. Entre em contato com o suporte para regularizar.
              </p>
              {salon.next_payment_date && (
                <div className="text-[9px] text-neutral-500 font-mono font-bold">
                  Vencimento original: {new Date(salon.next_payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
            {salon.whatsapp_number && (
              <a
                href={`https://wa.me/${salon.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-2 rounded-xl whitespace-nowrap transition active:scale-95 shrink-0 shadow-lg"
              >
                Falar c/ Suporte
              </a>
            )}
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-green-400 font-bold text-[11px] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Assinatura Ativa
              </div>
              <p className="text-[10px] text-neutral-400">
                Sua loja está com o faturamento em dia e operando normalmente!
              </p>
            </div>
            {salon.next_payment_date && (
              <div className="text-right shrink-0">
                <div className="text-[9px] text-neutral-500 font-bold uppercase">Vencimento</div>
                <div className="text-[11px] font-mono text-green-400 font-black">
                  {new Date(salon.next_payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {tab === 'agenda' && <AgendaTab appointments={appointments} services={services} professionals={professionals} onRefresh={onRefresh} salonId={salonId} />}
        {tab === 'servicos' && <ServicosTab services={services} salonId={salonId} onRefresh={onRefresh} />}
        {tab === 'profissionais' && <ProfissionaisTab professionals={professionals} services={services} salonId={salonId} onRefresh={onRefresh} />}
        {tab === 'vitrine' && <VitrineTab salon={salon} onRefresh={onRefresh} />}
        {tab === 'configuracoes' && <ConfigTab salon={salon} onRefresh={onRefresh} />}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex z-40">
        {([
          ['agenda', 'Agenda', Calendar, pendingCount],
          ['servicos', 'Serviços', Scissors, 0],
          ['profissionais', 'Equipe', Users, 0],
          ['vitrine', 'Vitrine', Eye, 0],
          ['configuracoes', 'Config', Settings, 0],
        ] as const).map(([key, label, Icon, badge]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 relative transition ${tab === key ? 'text-red-400' : 'text-neutral-500'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{label}</span>
            {badge > 0 && <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">{badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AGENDA TAB ────────────────────────────────────────────────────────────────
function AgendaTab({ appointments, services, professionals, onRefresh, salonId }: {
  appointments: Appointment[]; services: Service[]; professionals: Professional[];
  onRefresh: () => void; salonId: string;
}) {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'|'cancelled'>('all');
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const todayStr = getLocalDateString();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return getLocalDateString(d);
  });

  const filtered = appointments
    .filter(a => a.date === selectedDate)
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => a.time.localeCompare(b.time));

  function updateStatus(appt: Appointment, status: Appointment['status']) {
    if (status === 'completed') {
      if (appt.date !== todayStr) {
        alert('Você só pode marcar este agendamento como concluído no dia exato do serviço.');
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'Confirmar Conclusão',
        message: 'Deseja confirmar conclusão do serviço?',
        onConfirm: () => {
          const all = db.getAppointments();
          db.saveAppointments(all.map(a => a.id === appt.id ? { ...a, status } : a));
          setConfirmDialog(null);
          onRefresh();
        }
      });
      return;
    }

    if (status === 'cancelled') {
      setConfirmDialog({
        isOpen: true,
        title: 'Cancelar Agendamento',
        message: 'Deseja cancelar o agendamento?',
        onConfirm: () => {
          const all = db.getAppointments();
          db.saveAppointments(all.map(a => a.id === appt.id ? { ...a, status } : a));
          setConfirmDialog(null);
          onRefresh();
        }
      });
      return;
    }

    const all = db.getAppointments();
    db.saveAppointments(all.map(a => a.id === appt.id ? { ...a, status } : a));
    onRefresh();
  }

  function deleteAppt(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancelar Agendamento',
      message: 'Deseja cancelar o agendamento?',
      onConfirm: () => {
        db.saveAppointments(db.getAppointments().filter(a => a.id !== id));
        setConfirmDialog(null);
        onRefresh();
      }
    });
  }

  const todayCount = appointments.filter(a => a.date === todayStr).length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Hoje', value: todayCount, color: 'text-red-400' },
          { label: 'Pendentes', value: appointments.filter(a=>a.status==='pending').length, color: 'text-yellow-400' },
          { label: 'Concluídos', value: completedCount, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-neutral-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {dates.map(d => {
          const dt = new Date(d + 'T12:00:00');
          const count = appointments.filter(a => a.date === d).length;
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition active:scale-95 ${d === selectedDate ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>
              <span className="text-[10px] font-bold uppercase">{dt.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span>
              <span className="text-base font-black">{dt.getDate()}</span>
              {count > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {(['all','pending','confirmed','completed','cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition ${filter === f ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
            {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Appointments */}
      {filtered.length === 0
        ? <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500 text-sm">Nenhum agendamento neste dia</div>
        : filtered.map(appt => (
          <div key={appt.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">{appt.time}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${STATUS_COLOR[appt.status]}`}>{STATUS_LABEL[appt.status]}</span>
                </div>
                <p className="text-sm text-white font-bold mt-0.5">{appt.client_name}</p>
                <p className="text-xs text-neutral-400">{appt.service_title}</p>
                {appt.professional_name && <p className="text-xs text-neutral-500">👩 {appt.professional_name}</p>}
                <p className="text-xs text-red-400 font-bold">R$ {appt.service_price.toFixed(2)}</p>
              </div>
              <button onClick={() => deleteAppt(appt.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg transition">
                <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
              </button>
            </div>
            {appt.client_phone && (
              <a href={`https://wa.me/${appt.client_phone.replace(/\D/g,'')}`} target="_blank"
                className="flex items-center gap-1.5 text-[11px] text-green-400 font-bold">
                📱 {appt.client_phone}
              </a>
            )}
            {/* Status actions */}
            {appt.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(appt,'confirmed')} className="flex-1 bg-blue-500/10 text-blue-400 font-bold py-1.5 rounded-xl text-xs active:scale-95 transition">Confirmar</button>
                <button onClick={() => updateStatus(appt,'cancelled')} className="flex-1 bg-red-500/10 text-red-400 font-bold py-1.5 rounded-xl text-xs active:scale-95 transition">Cancelar</button>
              </div>
            )}
            {appt.status === 'confirmed' && (
              <button 
                onClick={() => updateStatus(appt,'completed')} 
                disabled={appt.date !== todayStr}
                className={`w-full font-bold py-1.5 rounded-xl text-xs active:scale-95 transition ${
                  appt.date === todayStr 
                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                }`}
              >
                {appt.date === todayStr ? '✅ Marcar como Concluído' : '📅 Conclusão permitida apenas hoje'}
              </button>
            )}
          </div>
        ))}

      {/* Caixa de diálogo de confirmação */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xs p-6 space-y-4 shadow-2xl text-center">
            <h3 className="font-black text-white text-base">{confirmDialog.title}</h3>
            <p className="text-xs text-neutral-400">{confirmDialog.message}</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-95"
              >
                Não
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-red-600/25"
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

// ── SERVIÇOS TAB ──────────────────────────────────────────────────────────────
function ServicosTab({ services, salonId, onRefresh }: { services: Service[]; salonId: string; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const [form, setForm] = useState({ title:'', description:'', price:'', duration_minutes:'60', category:'' });
  const [success, setSuccess] = useState('');

  function openAdd() { setEditSvc(null); setForm({ title:'',description:'',price:'',duration_minutes:'60',category:'' }); setShowForm(true); }
  function openEdit(s: Service) { setEditSvc(s); setForm({ title:s.title, description:s.description, price:String(s.price), duration_minutes:String(s.duration_minutes), category:s.category||'' }); setShowForm(true); }

  function save() {
    if (!form.title || !form.price) return;
    const all = db.getServices();
    if (editSvc) {
      db.saveServices(all.map(s => s.id === editSvc.id ? { ...s, ...form, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes) } : s));
    } else {
      const newSvc: Service = { id:`svc-${Date.now()}`, salon_id: salonId, ...form, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes), active: true, created_at: new Date().toISOString() };
      db.saveServices([...all, newSvc]);
    }
    setShowForm(false); setSuccess(editSvc ? 'Serviço atualizado!' : 'Serviço cadastrado!'); onRefresh();
    setTimeout(() => setSuccess(''), 3000);
  }

  function remove(id: string) {
    if (!confirm('Excluir este serviço?')) return;
    db.saveServices(db.getServices().filter(s => s.id !== id)); onRefresh();
  }

  return (
    <div className="space-y-3">
      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-xs">✅ {success}</div>}
      <button onClick={openAdd} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition">
        <Plus className="w-4 h-4" /> Novo Serviço
      </button>
      {services.length === 0 && <div className="text-center text-neutral-500 text-sm py-8">Nenhum serviço cadastrado</div>}
      {services.map(s => (
        <div key={s.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm">{s.title}</h3>
                {s.category && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">{s.category}</span>}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{s.description}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-red-400 font-black text-sm">R$ {s.price.toFixed(2)}</span>
                <span className="text-neutral-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}min</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => openEdit(s)} className="p-1.5 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition"><Edit2 className="w-3.5 h-3.5 text-neutral-400" /></button>
              <button onClick={() => remove(s.id)} className="p-1.5 bg-neutral-800 rounded-lg hover:bg-red-900/40 transition"><Trash2 className="w-3.5 h-3.5 text-neutral-400" /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900">
              <h2 className="font-black text-white">{editSvc ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-neutral-800 rounded-lg"><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label:'Nome do Serviço *', key:'title', placeholder:'Ex: Corte Feminino' },
                { label:'Descrição', key:'description', placeholder:'Descreva o serviço...', multi: true },
                { label:'Preço (R$) *', key:'price', placeholder:'0.00', type:'number' },
                { label:'Duração (minutos)', key:'duration_minutes', placeholder:'60', type:'number' },
                { label:'Categoria', key:'category', placeholder:'Ex: Cabelo, Unhas...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">{f.label}</label>
                  {f.multi
                    ? <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500 transition resize-none" />
                    : <input type={f.type||'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500 transition" />}
                </div>
              ))}
              <button onClick={save} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl text-sm active:scale-95 transition">
                {editSvc ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PROFISSIONAIS TAB ─────────────────────────────────────────────────────────
function ProfissionaisTab({ professionals, services, salonId, onRefresh }: { professionals: Professional[]; services: Service[]; salonId: string; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editProf, setEditProf] = useState<Professional | null>(null);
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['seg','ter','qua','qui','sex']);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  function openAdd() { setEditProf(null); setName(''); setSelectedDays(['seg','ter','qua','qui','sex']); setSelectedSpecs([]); setShowForm(true); }
  function openEdit(p: Professional) { setEditProf(p); setName(p.name); setSelectedDays(p.working_days); setSelectedSpecs(p.specialties); setShowForm(true); }

  function save() {
    if (!name.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Cadastro',
      message: 'Deseja salvar o profissional?',
      onConfirm: () => {
        const sortedDays = DAYS.filter(d => selectedDays.includes(d));
        const all = db.getProfessionals();
        if (editProf) {
          db.saveProfessionals(all.map(p => p.id === editProf.id ? { ...p, name, working_days: sortedDays, specialties: selectedSpecs } : p));
        } else {
          db.saveProfessionals([...all, { id:`prof-${Date.now()}`, salon_id: salonId, name, specialties: selectedSpecs, working_days: sortedDays, created_at: new Date().toISOString() }]);
        }
        setShowForm(false);
        onRefresh();
      }
    });
  }

  function remove(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: 'Deseja excluir o profissional?',
      onConfirm: () => {
        db.saveProfessionals(db.getProfessionals().filter(p => p.id !== id));
        onRefresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <button onClick={openAdd} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition">
        <Plus className="w-4 h-4" /> Novo Profissional
      </button>
      {professionals.length === 0 && <div className="text-center text-neutral-500 text-sm py-8">Nenhum profissional cadastrado</div>}
      {professionals.map(p => (
        <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm">{p.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {DAYS.filter(d => p.working_days.includes(d)).map(d => <span key={d} className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">{DAY_LABELS[d]}</span>)}
              </div>
              {p.specialties.length > 0 && <p className="text-[11px] text-neutral-400 mt-1">{p.specialties.join(', ')}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => openEdit(p)} className="p-1.5 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition"><Edit2 className="w-3.5 h-3.5 text-neutral-400" /></button>
              <button onClick={() => remove(p.id)} className="p-1.5 bg-neutral-800 rounded-lg hover:bg-red-900/40 transition"><Trash2 className="w-3.5 h-3.5 text-neutral-400" /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900">
              <h2 className="font-black text-white">{editProf ? 'Editar Profissional' : 'Novo Profissional'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-neutral-800 rounded-lg"><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do profissional"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500 transition" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-2">Dias de Trabalho</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} onClick={() => setSelectedDays(p => {
                      const next = p.includes(d) ? p.filter(x => x !== d) : [...p, d];
                      return DAYS.filter(x => next.includes(x));
                    })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedDays.includes(d) ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-2">Especialidades</label>
                <div className="space-y-1.5">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setSelectedSpecs(p => p.includes(s.title) ? p.filter(x=>x!==s.title) : [...p,s.title])}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${selectedSpecs.includes(s.title) ? 'bg-red-600 border-red-600' : 'border-neutral-600'}`}>
                        {selectedSpecs.includes(s.title) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm text-neutral-300">{s.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={save} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl text-sm active:scale-95 transition">
                {editProf ? 'Salvar' : 'Cadastrar Profissional'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de diálogo de confirmação */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xs p-6 space-y-4 shadow-2xl text-center">
            <h3 className="font-black text-white text-base">{confirmDialog.title}</h3>
            <p className="text-xs text-neutral-400">{confirmDialog.message}</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-95"
              >
                Não
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-red-600/25"
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

// ── VITRINE TAB ───────────────────────────────────────────────────────────────
function VitrineTab({ salon, onRefresh }: { salon: Salon; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}?salonId=${salon.id}`;

  function copyLink() { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-black text-white text-sm">🔗 Link de Agendamento</h3>
        <div className="bg-neutral-800 rounded-xl p-3 text-[11px] text-neutral-400 break-all">{link}</div>
        <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 font-bold py-3 rounded-xl text-sm active:scale-95 transition border border-red-500/20">
          {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Link</>}
        </button>
        <a href={link} target="_blank" className="w-full flex items-center justify-center gap-2 bg-neutral-800 text-neutral-300 font-bold py-2.5 rounded-xl text-sm transition hover:bg-neutral-700 active:scale-95">
          <Eye className="w-4 h-4" /> Visualizar Página do Cliente
        </a>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <h3 className="font-black text-white text-sm mb-2">📲 Como compartilhar</h3>
        <ul className="space-y-2 text-xs text-neutral-400">
          <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>Envie o link no WhatsApp para seus clientes</li>
          <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>Cole na bio do Instagram</li>
          <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>Adicione nos stories com o link externo</li>
          <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>Imprima um QR Code e cole no salão</li>
        </ul>
      </div>
    </div>
  );
}

// ── CONFIG TAB ────────────────────────────────────────────────────────────────
function ConfigTab({ salon, onRefresh }: { salon: Salon; onRefresh: () => void }) {
  const [form, setForm] = useState({
    store_name: salon.store_name,
    name: salon.name,
    bio: salon.bio || '',
    whatsapp_number: salon.whatsapp_number || '',
    address: salon.address || '',
  });
  const [wh, setWh] = useState(salon.working_hours || {});
  const [success, setSuccess] = useState('');

  function save() {
    const all = db.getSalons();
    db.saveSalons(all.map(s => s.id === salon.id ? { ...s, ...form, working_hours: wh } : s));
    setSuccess('Configurações salvas!'); onRefresh();
    setTimeout(() => setSuccess(''), 3000);
  }

  return (
    <div className="space-y-4">
      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-xs">✅ {success}</div>}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-black text-white text-sm">Informações do Salão</h3>
        {[
          { label:'Nome do Salão', key:'store_name' },
          { label:'Responsável', key:'name' },
          { label:'WhatsApp', key:'whatsapp_number', placeholder:'5511999999999' },
          { label:'Endereço', key:'address', placeholder:'Rua, número, bairro...' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500 transition" />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Bio / Descrição</label>
          <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500 transition resize-none" />
        </div>
      </div>

      {/* Working hours */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-black text-white text-sm">Horários de Funcionamento</h3>
        {DAYS.map(d => (
          <div key={d} className="flex items-center gap-2">
            <button onClick={() => setWh(p => ({ ...p, [d]: { ...(p[d] || { open:'09:00', close:'18:00' }), enabled: !(p[d]?.enabled ?? true) } }))}
              className={`w-10 h-5 rounded-full transition ${(wh[d]?.enabled ?? d !== 'dom') ? 'bg-red-600' : 'bg-neutral-700'} relative`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${(wh[d]?.enabled ?? d !== 'dom') ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs text-neutral-400 w-8 font-bold">{DAY_LABELS[d]}</span>
            {(wh[d]?.enabled ?? d !== 'dom') && (
              <>
                <input type="time" value={wh[d]?.open || '09:00'} onChange={e => setWh(p => ({ ...p, [d]: { ...p[d], open: e.target.value } }))}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs outline-none" />
                <span className="text-neutral-600 text-xs">às</span>
                <input type="time" value={wh[d]?.close || '18:00'} onChange={e => setWh(p => ({ ...p, [d]: { ...p[d], close: e.target.value } }))}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs outline-none" />
              </>
            )}
          </div>
        ))}
      </div>

      <button onClick={save} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3 rounded-xl text-sm active:scale-95 transition">
        Salvar Configurações
      </button>
    </div>
  );
}
