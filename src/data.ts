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

export const INITIAL_SALONS: Salon[] = [];
// Salões são criados pelo admin — não há dados demo iniciais

export const INITIAL_SERVICES: Service[] = [];

export const INITIAL_PROFESSIONALS: Professional[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_LINKS: AccessLink[] = [];
export const INITIAL_CLIENTS: ClientRegistration[] = [];
