export type UserRole = 'admin' | 'salon' | 'client';

export type SubscriptionStatus = 'active' | 'suspended';

export interface Salon {
  id: string;
  name: string;           // nome do dono/responsável
  store_name: string;     // nome do salão
  email: string;
  password?: string;
  subscription_status: SubscriptionStatus;
  whatsapp_number: string;
  plan_id: string;
  created_at: string;
  bio?: string;
  theme_color?: string;
  store_logo?: string;
  store_banners?: string[];
  categories?: string[];  // categorias de serviço (cabelo, unhas, estética...)
  first_payment_date?: string;
  next_payment_date?: string;
  payment_status?: 'active' | 'overdue';
  working_hours?: WorkingHours;
  address?: string;
}

export interface WorkingHours {
  [day: string]: { open: string; close: string; enabled: boolean };
}

export interface Service {
  id: string;
  salon_id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number; // duração em minutos
  category?: string;
  image_url?: string;
  active: boolean;
  created_at: string;
}

export interface Professional {
  id: string;
  salon_id: string;
  name: string;
  photo_url?: string;
  specialties: string[]; // serviços que realiza
  working_days: string[]; // ['seg','ter','qua','qui','sex','sab']
  created_at: string;
}

export interface Appointment {
  id: string;
  salon_id: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  service_id: string;
  service_title: string;
  service_price: number;
  service_duration: number;
  professional_id?: string;
  professional_name?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'mensal' | 'anual';
  features: string[];
}

export interface AccessLink {
  id: string;
  salon_id: string;
  token_unique: string;
  expiration_date: string;
  max_users?: number;
  clicks_count: number;
  label: string;
}

export interface ClientRegistration {
  id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}
