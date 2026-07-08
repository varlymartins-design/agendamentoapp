import { Salon, Service, Professional, Appointment, Plan, AccessLink } from './types';

export const INITIAL_PLANS: Plan[] = [
  {
    id: 'plan-basic',
    name: 'Básico',
    price: 49.90,
    interval: 'mensal',
    features: ['Até 10 serviços', '1 profissional', 'Link de agendamento', 'Agenda online']
  },
  {
    id: 'plan-pro',
    name: 'Profissional',
    price: 89.90,
    interval: 'mensal',
    features: ['Serviços ilimitados', 'Até 5 profissionais', 'Link personalizado', 'Agenda + WhatsApp', 'Relatórios']
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    price: 149.90,
    interval: 'mensal',
    features: ['Tudo do Profissional', 'Profissionais ilimitados', 'Múltiplos links', 'Suporte prioritário', 'Personalização completa']
  }
];

export const INITIAL_SALONS: Salon[] = [
  {
    id: 'salao-demo',
    name: 'Ana Lima',
    store_name: 'Salão da Ana',
    email: 'ana@salao.com',
    password: '123456',
    subscription_status: 'active',
    whatsapp_number: '5511999999999',
    plan_id: 'plan-pro',
    created_at: new Date().toISOString(),
    bio: 'Especialistas em cortes, coloração e tratamentos capilares. Agende seu horário!',
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
  }
];

export const INITIAL_SERVICES: Service[] = [
  { id: 'serv-1', salon_id: 'salao-demo', title: 'Corte Feminino', description: 'Corte moderno com lavagem e escova', price: 60, duration_minutes: 60, category: 'Cabelo', active: true, created_at: new Date().toISOString() },
  { id: 'serv-2', salon_id: 'salao-demo', title: 'Coloração', description: 'Coloração completa com produtos premium', price: 150, duration_minutes: 120, category: 'Cabelo', active: true, created_at: new Date().toISOString() },
  { id: 'serv-3', salon_id: 'salao-demo', title: 'Escova Progressiva', description: 'Alinhamento e redução de volume', price: 180, duration_minutes: 150, category: 'Cabelo', active: true, created_at: new Date().toISOString() },
  { id: 'serv-4', salon_id: 'salao-demo', title: 'Manicure', description: 'Cuidado completo das unhas das mãos', price: 35, duration_minutes: 45, category: 'Unhas', active: true, created_at: new Date().toISOString() },
  { id: 'serv-5', salon_id: 'salao-demo', title: 'Pedicure', description: 'Cuidado completo das unhas dos pés', price: 40, duration_minutes: 50, category: 'Unhas', active: true, created_at: new Date().toISOString() },
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  { id: 'prof-1', salon_id: 'salao-demo', name: 'Ana Lima', specialties: ['Corte Feminino', 'Coloração', 'Escova Progressiva'], working_days: ['seg','ter','qua','qui','sex'], created_at: new Date().toISOString() },
  { id: 'prof-2', salon_id: 'salao-demo', name: 'Carla Santos', specialties: ['Manicure', 'Pedicure'], working_days: ['seg','ter','qua','qui','sex','sab'], created_at: new Date().toISOString() },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_LINKS: AccessLink[] = [];
export const INITIAL_CLIENTS: ClientRegistration[] = [];
