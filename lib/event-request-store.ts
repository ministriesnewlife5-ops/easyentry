export type EventRequestStatus = 'pending' | 'approved' | 'rejected';

export type EventRequest = {
  id: string;
  outletUserId: string;
  outletName: string;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    image: string;
    description: string;
    fullDescription: string;
    gatesOpen: string;
    entryAge: string;
    layout: string;
    seating: string;
  };
  status: EventRequestStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

let eventRequests: EventRequest[] = [];

export function getAllEventRequests(): EventRequest[] {
  return [...eventRequests];
}

export function getEventRequestsByOutlet(outletUserId: string): EventRequest[] {
  return eventRequests.filter(r => r.outletUserId === outletUserId);
}

export function getEventRequestById(id: string): EventRequest | undefined {
  return eventRequests.find(r => r.id === id);
}

export function createEventRequest(
  outletUserId: string,
  outletName: string,
  eventData: EventRequest['eventData']
): EventRequest {
  const newRequest: EventRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    outletUserId,
    outletName,
    eventData,
    status: 'pending',
    submittedAt: Date.now(),
  };
  eventRequests.push(newRequest);
  return newRequest;
}

export function updateEventRequestStatus(
  id: string,
  status: EventRequestStatus,
  reviewedBy: string,
  rejectionReason?: string
): EventRequest | undefined {
  const request = eventRequests.find(r => r.id === id);
  if (!request) return undefined;
  
  request.status = status;
  request.reviewedAt = Date.now();
  request.reviewedBy = reviewedBy;
  if (rejectionReason) {
    request.rejectionReason = rejectionReason;
  }
  return request;
}

export function deleteEventRequest(id: string): boolean {
  const initialLength = eventRequests.length;
  eventRequests = eventRequests.filter(r => r.id !== id);
  return eventRequests.length < initialLength;
}
