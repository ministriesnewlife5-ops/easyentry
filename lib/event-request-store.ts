import { supabase } from './supabase';

export type EventRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type TicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  availableFrom?: string;
  availableUntil?: string;
};

export type EventRequest = {
  id: string;
  outletUserId: string;
  outletName: string;
  outletEmail?: string;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    image: string;
    mediaFiles?: string[];
    numberOfTickets?: string;
    rules?: string[];
    ticketCategories?: TicketCategory[];
    description: string;
    fullDescription: string;
    gatesOpen: string;
    entryAge: string;
    layout: string;
    seating: string;
    // Commission fields
    commissionPercent?: number;
    estimatedTotalRevenue?: number;
    estimatedTotalCommission?: number;
  };
  status: EventRequestStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type CreateEventRequestInput = {
  title: string;
  date: string;
  description?: string;
  userId?: string;
  venueId?: string;
  eventType?: string;
  expectedAttendance?: number;
  budget?: number;
  requirements?: string[];
  attachments?: string[];
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  outletUserId?: string;
  outletName?: string;
  outletEmail?: string;
  eventData?: EventRequest['eventData'];
};

export type UpdateEventRequestInput = Partial<Omit<CreateEventRequestInput, 'userId' | 'outletUserId'>> & {
  status?: EventRequestStatus;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

// Map legacy EventRequest to database schema
function mapLegacyToDb(request: Partial<EventRequest> & {
  outletUserId?: string;
  outletName?: string;
  outletEmail?: string;
  eventData?: EventRequest['eventData'];
}) {
  const ticketCategories = request.eventData?.ticketCategories || [];
  const commissionPercent = request.eventData?.commissionPercent ?? 0;

  // Compute totals from ticket categories
  const estimatedTotalRevenue = ticketCategories.reduce(
    (sum, t) => sum + (t.price * (t.quantity ?? 1)),
    0
  );
  const estimatedTotalCommission = ticketCategories.reduce(
    (sum, t) => sum + ((t.commissionAmount ?? (t.price * commissionPercent / 100)) * (t.quantity ?? 1)),
    0
  );

  return {
    title: request.eventData?.title || 'Untitled Event',
    date: request.eventData?.date || new Date().toISOString().split('T')[0],
    description: request.eventData?.description || request.eventData?.fullDescription || null,
    user_id: request.outletUserId || null,
    outlet_name: request.outletName || null,
    outlet_email: request.outletEmail || null,
    venue_id: null,
    event_type: request.eventData?.category || null,
    expected_attendance: request.eventData?.numberOfTickets ? parseInt(request.eventData.numberOfTickets) : null,
    budget: request.eventData?.price ? parseFloat(request.eventData.price.replace(/[^0-9.]/g, '')) : null,
    requirements: request.eventData?.rules || null,
    attachments: request.eventData?.mediaFiles || null,
    contact_email: null,
    contact_phone: null,
    notes: request.rejectionReason || null,
    status: request.status || 'pending',
    // Full event data as JSONB
    event_data: request.eventData ? {
      ...request.eventData,
      ticketCategories: ticketCategories,
      commissionPercent,
      estimatedTotalRevenue,
      estimatedTotalCommission,
    } : null,
    commission_percent: commissionPercent,
    ticket_categories: ticketCategories.length > 0 ? ticketCategories : null,
    estimated_total_revenue: estimatedTotalRevenue || null,
    estimated_total_commission: estimatedTotalCommission || null,
  };
}

// Map database record to legacy EventRequest
function mapDbToLegacy(record: Record<string, unknown>): EventRequest {
  // Prefer the full event_data JSONB if present
  const storedEventData = record.event_data as EventRequest['eventData'] | null;
  const ticketCategories = (record.ticket_categories as TicketCategory[]) || storedEventData?.ticketCategories || [];

  return {
    id: record.id as string,
    outletUserId: (record.user_id as string) || '',
    outletName: (record.outlet_name as string) || '',
    outletEmail: (record.outlet_email as string) || '',
    eventData: storedEventData ?? {
      title: (record.title as string) || '',
      subtitle: '',
      date: (record.date as string) || '',
      time: '',
      venue: '',
      category: (record.event_type as string) || '',
      price: (record.budget as number)?.toString() || '',
      image: (record.attachments as string[])?.[0] || '',
      mediaFiles: (record.attachments as string[]) || [],
      description: (record.description as string) || '',
      fullDescription: (record.description as string) || '',
      gatesOpen: '',
      entryAge: '',
      layout: '',
      seating: '',
      ticketCategories,
      commissionPercent: (record.commission_percent as number) || 0,
      estimatedTotalRevenue: (record.estimated_total_revenue as number) || 0,
      estimatedTotalCommission: (record.estimated_total_commission as number) || 0,
    },
    status: (record.status as EventRequestStatus) || 'pending',
    submittedAt: new Date(record.created_at as string).getTime(),
    reviewedAt: record.reviewed_at ? new Date(record.reviewed_at as string).getTime() : undefined,
    reviewedBy: (record.reviewed_by as string) || undefined,
    rejectionReason: (record.notes as string) || undefined,
  };
}

/**
 * Get all event requests
 */
export async function getAllEventRequests(): Promise<EventRequest[]> {
  const { data, error } = await supabase
    .from('event_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get event requests: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map(mapDbToLegacy) || [];
}

/**
 * Get event requests by user/outlet ID
 */
export async function getEventRequestsByOutlet(outletUserId: string): Promise<EventRequest[]> {
  const { data, error } = await supabase
    .from('event_requests')
    .select('*')
    .eq('user_id', outletUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get outlet event requests: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map(mapDbToLegacy) || [];
}

/**
 * Get a single event request by ID
 */
export async function getEventRequestById(id: string): Promise<EventRequest | undefined> {
  const { data, error } = await supabase
    .from('event_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to get event request: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Create a new event request
 */
export async function createEventRequest(
  outletUserId: string,
  outletName: string,
  eventData: EventRequest['eventData'],
  outletEmail?: string,
): Promise<EventRequest> {
  const dbData = mapLegacyToDb({
    outletUserId,
    outletName,
    outletEmail,
    eventData,
    status: 'pending',
  });

  const { data, error } = await supabase
    .from('event_requests')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event request: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Update event request status
 */
export async function updateEventRequestStatus(
  id: string,
  status: EventRequestStatus,
  reviewedBy: string,
  rejectionReason?: string
): Promise<EventRequest | undefined> {
  const updateData: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy,
  };

  if (rejectionReason) {
    updateData.notes = rejectionReason;
  }

  const { data, error } = await supabase
    .from('event_requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to update event request: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Delete an event request
 */
export async function deleteEventRequest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('event_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete event request:', error.message);
    return false;
  }

  return true;
}

/**
 * Update an event request (legacy compatibility)
 */
export async function updateEventRequest(
  id: string,
  input: UpdateEventRequestInput
): Promise<EventRequest | undefined> {
  const updateData: Record<string, unknown> = {};

  if (input.status !== undefined) updateData.status = input.status;
  if (input.reviewedAt !== undefined) updateData.reviewed_at = new Date(input.reviewedAt).toISOString();
  if (input.reviewedBy !== undefined) updateData.reviewed_by = input.reviewedBy;
  if (input.rejectionReason !== undefined) updateData.notes = input.rejectionReason;
  if (input.eventData?.title !== undefined) updateData.title = input.eventData.title;
  if (input.eventData?.date !== undefined) updateData.date = input.eventData.date;
  if (input.eventData?.description !== undefined) updateData.description = input.eventData.description;
  if (input.eventData?.category !== undefined) updateData.event_type = input.eventData.category;

  const { data, error } = await supabase
    .from('event_requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to update event request: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Approve an event request
 */
export async function approveEventRequest(
  id: string,
  reviewedBy: string
): Promise<EventRequest | undefined> {
  return updateEventRequestStatus(id, 'approved', reviewedBy);
}

/**
 * Reject an event request
 */
export async function rejectEventRequest(
  id: string,
  reviewedBy: string,
  rejectionReason?: string
): Promise<EventRequest | undefined> {
  return updateEventRequestStatus(id, 'rejected', reviewedBy, rejectionReason);
}
