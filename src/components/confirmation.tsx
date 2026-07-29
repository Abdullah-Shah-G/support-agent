"use client";

import type { Ticket } from "@/lib/types";

interface ConfirmationProps {
  ticket: Partial<Ticket>;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function Confirmation({ ticket, onConfirm, onCancel, loading }: ConfirmationProps) {
  return (
    <div className="confirmation-card">
      <h3>Confirm Ticket</h3>
      <div className="confirmation-fields">
        <div className="conf-field">
          <span className="conf-label">Title</span>
          <span className="conf-value">{ticket.title}</span>
        </div>
        <div className="conf-field">
          <span className="conf-label">Description</span>
          <span className="conf-value">{ticket.description}</span>
        </div>
        <div className="conf-field">
          <span className="conf-label">Priority</span>
          <span className={`conf-value priority-${ticket.priority}`}>{ticket.priority}</span>
        </div>
        <div className="conf-field">
          <span className="conf-label">Email</span>
          <span className="conf-value">{ticket.customer_email}</span>
        </div>
        {ticket.product_id && (
          <div className="conf-field">
            <span className="conf-label">Product</span>
            <span className="conf-value">{ticket.product_id}</span>
          </div>
        )}
        {ticket.attachments && (
          <div className="conf-field">
            <span className="conf-label">Attachments</span>
            <span className="conf-value">{ticket.attachments}</span>
          </div>
        )}
      </div>
      <div className="confirmation-actions">
        <button className="btn-confirm" onClick={onConfirm} disabled={loading}>
          {loading ? "Creating..." : "Create Ticket"}
        </button>
        <button className="btn-cancel" onClick={onCancel} disabled={loading}>
          Revise
        </button>
      </div>
    </div>
  );
}
