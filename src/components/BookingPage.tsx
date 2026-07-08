import { useState, useEffect } from 'react';
import { db } from '../db';
import { Salon, Service, Professional, Appointment } from '../types';
import { ChevronLeft, Check, Clock, Calendar, User, Scissors, Phone, ChevronRight } from 'lucide-react';

type Step = 'home' | 'service' | 'professional' | 'datetime' | 'form' | 'success';

const DAY_MAP: Record<string, number> = { dom:0, seg:1, ter:2, qua:3, qui:4, sex:5, sab:6 };

function generateTimeSlots(open: string, close: string, duration: number): string[] {
  const slots: string[] = [];
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur + duration <= end) {
    slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);
    cur += duration;
  }
  return slots;
}

export default function BookingPage({ salonId, refreshCounter }: { salonId: string; refreshCounter: number }) {
  const [step, setStep] = useState<Step>('home');
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Selections
  const [selService, setSelService] = useState<Service | null>(null);
  const [selProfessional, setSelProfessional] = useState<Professional | null>(null);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('');

  // Form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const s = db.getSalons().find(s => s.id === salonId);
    setSalon(s || null);
    setServices(db.getServices().filter(s => s.salon_id === salonId && s.active));
    setProfessionals(db.getProfessionals().filter(p => p.salon_id === salonId));
    setAppointments(db.getAppointments().filter(a => a.salon_id === salonId));
  }, [salonId, refreshCounter]);

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))] as string[];

  // Available dates (next 30 days, respecting working hours)
  function getAvailableDates(): string[] {
    const dates: string[] = [];
    const wh = salon?.working_hours || {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dayKey = ['dom','seg','ter','qua','qui','sex','sab'][d.getDay()];
      const profWorksDay = !selProfessional || selProfessional.working_days.includes(dayKey);
      const salonOpen = wh[dayKey]?.enabled !== false;
      if (profWorksDay && salonOpen) dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  // Available times for selected date
  function getAvailableTimes(): string[] {
    if (!selDate || !selService) return [];
    const d = new Date(selDate + 'T12:00:00');
    const dayKey = ['dom','seg','ter','qua','qui','sex','sab'][d.getDay()];
    const wh = salon?.working_hours?.[dayKey];
    if (!wh?.enabled) return [];
    const slots = generateTimeSlots(wh.open || '09:00', wh.close || '18:00', selService.duration_minutes);
    // Remove booked slots
    const booked = appointments
      .filter(a => a.date === selDate && a.status !== 'cancelled' && (!selProfessional || a.professional_id === selProfessional.id))
      .map(a => a.time);
    return slots.filter(t => !booked.includes(t));
  }

  async function submitBooking() {
    if (!clientName.trim() || !clientPhone.trim()) { setFormError('Nome e telefone são obrigatórios.'); return; }
    if (!selService || !selDate || !selTime) { setFormError('Selecione serviço, data e horário.'); return; }
    setSubmitting(true);
    const appt: Appointment = {
      id: `appt-${Date.now()}`,
      salon_id: salonId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim().replace(/\D/g,''),
      client_email: clientEmail.trim(),
      service_id: selService.id,
      service_title: selService.title,
      service_price: selService.price,
      service_duration: selService.duration_minutes,
      professional_id: selProfessional?.id,
      professional_name: selProfessional?.name,
      date: selDate,
      time: selTime,
      status: 'pending',
      notes: notes.trim(),
      whatsapp_sent: false,
      created_at: new Date().toISOString(),
    };
    const all = db.getAppointments();
    db.saveAppointments([...all, appt]);
    setSubmitting(false);
    setStep('success');
  }

  if (!salon) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
      <div className="text-center">
        <div className="text-4xl mb-3">✂️</div>
        <p className="text-sm">Carregando...</p>
      </div>
    </div>
  );

  const availableDates = step === 'datetime' ? getAvailableDates() : [];
  const availableTimes = step === 'datetime' && selDate ? getAvailableTimes() : [];

  // Filter professionals that do the selected service
  const eligiblePros = selService
    ? professionals.filter(p => p.specialties.length === 0 || p.specialties.includes(selService.title))
    : professionals;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        {step !== 'home' && step !== 'success' && (
          <button onClick={() => {
            if (step === 'service') setStep('home');
            else if (step === 'professional') setStep('service');
            else if (step === 'datetime') setStep('professional');
            else if (step === 'form') setStep('datetime');
          }} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5 text-neutral-400" />
          </button>
        )}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {salon.store_logo
            ? <img src={salon.store_logo} className="w-8 h-8 rounded-xl object-cover shrink-0" />
            : <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-base shrink-0">✂️</div>}
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate leading-none">{salon.store_name}</h1>
            <p className="text-[10px] text-neutral-500">Agendamento Online</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      {step !== 'home' && step !== 'success' && (
        <div className="flex bg-neutral-900/50 border-b border-neutral-800">
          {(['service','professional','datetime','form'] as Step[]).map((s, i) => {
            const steps: Step[] = ['service','professional','datetime','form'];
            const idx = steps.indexOf(step);
            const labels = ['Serviço','Profissional','Data/Hora','Dados'];
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s} className="flex-1 flex flex-col items-center py-2 gap-0.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition ${done ? 'bg-green-500 text-white' : active ? 'bg-pink-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                  {done ? '✓' : i+1}
                </div>
                <span className={`text-[8px] font-bold ${active ? 'text-pink-400' : done ? 'text-green-400' : 'text-neutral-600'}`}>{labels[i]}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 p-4">

        {/* HOME */}
        {step === 'home' && (
          <div className="space-y-4">
            {/* Salon info */}
            <div className="text-center space-y-2 py-4">
              {salon.store_logo
                ? <img src={salon.store_logo} className="w-20 h-20 rounded-2xl object-cover mx-auto" />
                : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-4xl mx-auto">✂️</div>}
              <h2 className="text-xl font-black text-white">{salon.store_name}</h2>
              {salon.bio && <p className="text-sm text-neutral-400 max-w-xs mx-auto">{salon.bio}</p>}
              {salon.address && <p className="text-xs text-neutral-500">📍 {salon.address}</p>}
            </div>

            {/* CTA */}
            <button onClick={() => setStep('service')}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-4 rounded-2xl text-base active:scale-95 transition shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" /> Agendar Agora
            </button>

            {/* Services preview */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs text-neutral-500 uppercase font-bold">Nossos Serviços</h3>
                {categories.map(cat => {
                  const catServices = services.filter(s => s.category === cat);
                  return (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setStep('service'); }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition">
                      <div className="text-left">
                        <div className="font-bold text-white text-sm">{cat}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">{catServices.length} serviço{catServices.length !== 1 ? 's' : ''} disponível{catServices.length !== 1 ? 'is' : ''}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Working hours */}
            {salon.working_hours && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <h3 className="text-xs text-neutral-500 uppercase font-bold mb-3">Horários</h3>
                <div className="space-y-1.5">
                  {['seg','ter','qua','qui','sex','sab','dom'].map(d => {
                    const wh = salon.working_hours![d];
                    const labels: Record<string,string> = {seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta',sab:'Sábado',dom:'Domingo'};
                    return (
                      <div key={d} className="flex justify-between text-xs">
                        <span className="text-neutral-400">{labels[d]}</span>
                        <span className={wh?.enabled !== false ? 'text-white font-bold' : 'text-neutral-600'}>
                          {wh?.enabled !== false ? `${wh?.open||'09:00'} – ${wh?.close||'18:00'}` : 'Fechado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SERVICE SELECTION */}
        {step === 'service' && (
          <div className="space-y-3">
            <h2 className="font-black text-white text-lg">Escolha o Serviço</h2>
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${!selectedCategory ? 'bg-pink-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                  Todos
                </button>
                {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${selectedCategory === c ? 'bg-pink-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {services.filter(s => !selectedCategory || s.category === selectedCategory).map(svc => (
              <button key={svc.id} onClick={() => { setSelService(svc); setStep('professional'); }}
                className={`w-full bg-neutral-900 border rounded-2xl p-4 text-left active:scale-95 transition ${selService?.id === svc.id ? 'border-pink-500 bg-pink-500/5' : 'border-neutral-800'}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm">{svc.title}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{svc.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-pink-400 font-black text-sm">R$ {svc.price.toFixed(2)}</span>
                      <span className="text-neutral-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration_minutes}min</span>
                    </div>
                  </div>
                  {selService?.id === svc.id && <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* PROFESSIONAL SELECTION */}
        {step === 'professional' && (
          <div className="space-y-3">
            <h2 className="font-black text-white text-lg">Escolha o Profissional</h2>
            <button onClick={() => { setSelProfessional(null); setStep('datetime'); }}
              className={`w-full bg-neutral-900 border rounded-2xl p-4 text-left active:scale-95 transition ${!selProfessional ? 'border-pink-500' : 'border-neutral-800'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">⭐</div>
                <div>
                  <div className="font-bold text-white text-sm">Qualquer disponível</div>
                  <div className="text-xs text-neutral-400">Primeiro horário livre</div>
                </div>
                {!selProfessional && <div className="ml-auto w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
              </div>
            </button>
            {eligiblePros.map(prof => (
              <button key={prof.id} onClick={() => { setSelProfessional(prof); setStep('datetime'); }}
                className={`w-full bg-neutral-900 border rounded-2xl p-4 text-left active:scale-95 transition ${selProfessional?.id === prof.id ? 'border-pink-500 bg-pink-500/5' : 'border-neutral-800'}`}>
                <div className="flex items-center gap-3">
                  {prof.photo_url
                    ? <img src={prof.photo_url} className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-600/30 flex items-center justify-center text-lg">💇‍♀️</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm">{prof.name}</div>
                    {prof.specialties.length > 0 && <div className="text-xs text-neutral-400 truncate">{prof.specialties.join(', ')}</div>}
                  </div>
                  {selProfessional?.id === prof.id && <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* DATE & TIME */}
        {step === 'datetime' && (
          <div className="space-y-4">
            <h2 className="font-black text-white text-lg">Escolha a Data</h2>
            <div className="grid grid-cols-4 gap-2">
              {availableDates.slice(0,28).map(d => {
                const dt = new Date(d + 'T12:00:00');
                return (
                  <button key={d} onClick={() => { setSelDate(d); setSelTime(''); }}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition active:scale-95 ${d === selDate ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>
                    <span className="text-[9px] font-bold uppercase">{dt.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span>
                    <span className="text-sm font-black">{dt.getDate()}</span>
                    <span className="text-[9px]">{dt.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span>
                  </button>
                );
              })}
            </div>

            {selDate && (
              <>
                <h2 className="font-black text-white text-lg mt-2">Escolha o Horário</h2>
                {availableTimes.length === 0
                  ? <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-500 text-sm">Nenhum horário disponível nesta data</div>
                  : <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map(t => (
                      <button key={t} onClick={() => setSelTime(t)}
                        className={`py-2.5 rounded-xl border text-sm font-bold transition active:scale-95 ${t === selTime ? 'bg-pink-500 border-pink-500 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>}
              </>
            )}

            {selDate && selTime && (
              <button onClick={() => setStep('form')}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-4 rounded-2xl text-sm active:scale-95 transition mt-2">
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="space-y-4">
            <h2 className="font-black text-white text-lg">Seus Dados</h2>

            {/* Summary */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Serviço</span><span className="text-white font-bold">{selService?.title}</span></div>
              {selProfessional && <div className="flex justify-between text-xs"><span className="text-neutral-400">Profissional</span><span className="text-white font-bold">{selProfessional.name}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Data</span><span className="text-white font-bold">{new Date(selDate+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span></div>
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Horário</span><span className="text-white font-bold">{selTime}</span></div>
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Valor</span><span className="text-pink-400 font-black">R$ {selService?.price.toFixed(2)}</span></div>
            </div>

            <div className="space-y-3">
              {[
                { label:'Nome Completo *', val: clientName, set: setClientName, placeholder:'Seu nome' },
                { label:'WhatsApp *', val: clientPhone, set: setClientPhone, placeholder:'(11) 99999-9999', type:'tel' },
                { label:'E-mail', val: clientEmail, set: setClientEmail, placeholder:'opcional', type:'email' },
                { label:'Observações', val: notes, set: setNotes, placeholder:'Alguma preferência ou observação?' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">{f.label}</label>
                  <input type={f.type||'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-pink-500 transition" />
                </div>
              ))}
            </div>

            {formError && <p className="text-red-400 text-xs">{formError}</p>}

            <button onClick={submitBooking} disabled={submitting}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-4 rounded-2xl text-sm active:scale-95 transition disabled:opacity-50 shadow-lg shadow-pink-500/20">
              {submitting ? 'Agendando...' : '✅ Confirmar Agendamento'}
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
            <div className="w-24 h-24 bg-green-500/10 border-2 border-green-500 rounded-full flex items-center justify-center text-5xl">✅</div>
            <div>
              <h2 className="text-2xl font-black text-white">Agendado!</h2>
              <p className="text-neutral-400 text-sm mt-2">Seu agendamento foi enviado com sucesso.</p>
              <p className="text-neutral-500 text-xs mt-1">Aguarde a confirmação do salão.</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 w-full max-w-xs space-y-2 text-left">
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Serviço</span><span className="text-white font-bold">{selService?.title}</span></div>
              {selProfessional && <div className="flex justify-between text-xs"><span className="text-neutral-400">Profissional</span><span className="text-white font-bold">{selProfessional.name}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Data</span><span className="text-white font-bold">{new Date(selDate+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</span></div>
              <div className="flex justify-between text-xs"><span className="text-neutral-400">Horário</span><span className="text-white font-bold">{selTime}</span></div>
            </div>
            {salon.whatsapp_number && (
              <a href={`https://wa.me/${salon.whatsapp_number}?text=Olá! Acabei de agendar ${selService?.title} para ${new Date(selDate+'T12:00:00').toLocaleDateString('pt-BR')} às ${selTime}.`}
                target="_blank"
                className="w-full max-w-xs flex items-center justify-center gap-2 bg-green-500 text-white font-black py-3.5 rounded-2xl text-sm active:scale-95 transition">
                📱 Confirmar pelo WhatsApp
              </a>
            )}
            <button onClick={() => { setStep('home'); setSelService(null); setSelProfessional(null); setSelDate(''); setSelTime(''); setClientName(''); setClientPhone(''); setClientEmail(''); setNotes(''); }}
              className="text-neutral-500 text-sm underline">
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
