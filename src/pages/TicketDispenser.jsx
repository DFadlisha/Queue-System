import { Navigate } from 'react-router-dom';

// Ticket Dispenser removed — redirect to home
export default function TicketDispenser() {
  return <Navigate to="/" replace />;
}