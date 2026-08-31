export type EventType = 'webinar' | 'kickoff' | 'finale' | 'other'

export interface Event {
  id: string
  title: string
  description: string | null
  event_type: EventType
  event_date: string | null
  location: string | null
  total_tickets: number
  is_open: boolean
  created_at: string
}

export interface EventFormData {
  title: string
  description?: string | null
  event_type: EventType
  event_date?: string | null
  location?: string | null
  total_tickets: number
  is_open: boolean
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string | null
  university: string | null
  faculty: string | null
  student_id: string | null
  created_at: string
}

export interface EventRegistrationFormData {
  event_id: string
  user_id?: string | null
  full_name: string
  email: string
  phone?: string | null
  university?: string | null
  faculty?: string | null
  student_id?: string | null
}

export interface EventWithStats extends Event {
  registered_count: number
  remaining_tickets: number
}
