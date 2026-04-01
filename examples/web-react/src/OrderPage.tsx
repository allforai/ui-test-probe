import React, { useState } from 'react';

// Order Management Page -- UI Test Probe annotation reference
// Each key control carries data-probe-* attributes for test observability.
// These attributes have ZERO production cost -- the collector is only
// injected during testing via Playwright addInitScript().

interface Order {
  id: string;
  customer: string;
  amount: number;
  status: string;
}

export default function OrderPage() {
  const [status, setStatus] = useState('all');
  const [orders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  return (
    // Page-level container -- probe hierarchy root
    <div
      data-probe-id="order-management-page"
      data-probe-type="page"
      data-probe-state="loaded"
      data-probe-children='["status-filter","order-table","order-paginator","create-order-btn"]'
    >
      <h1>Order Management</h1>

      {/* Selector -- linked to order-table via data_reload through API */}
      <select
        data-probe-id="status-filter"
        data-probe-type="selector"
        data-probe-state="idle"
        data-probe-parent="order-management-page"
        data-probe-options='["all","pending","completed","cancelled"]'
        data-probe-linkage='{
          "targets": [{
            "id": "order-table",
            "effect": "data_reload",
            "path": { "type": "api", "url": "GET /api/orders" }
          }]
        }'
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Data container -- table with sort/filter/source binding */}
      <table
        data-probe-id="order-table"
        data-probe-type="data-container"
        data-probe-state={orders.length ? 'loaded' : 'empty'}
        data-probe-parent="order-management-page"
        data-probe-rows={orders.length}
        data-probe-columns='[
          {"id":"id","label":"Order ID","visible":true},
          {"id":"customer","label":"Customer","visible":true},
          {"id":"amount","label":"Amount","visible":true},
          {"id":"status","label":"Status","visible":true}
        ]'
        data-probe-sort='{"column":"id","direction":"asc"}'
        data-probe-source='{"url":"/api/orders","method":"GET","status":200}'
      >
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}><td>{o.id}</td><td>{o.customer}</td><td>{o.amount}</td><td>{o.status}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Navigation -- paginator linked to order-table */}
      <nav
        data-probe-id="order-paginator"
        data-probe-type="navigation"
        data-probe-state="idle"
        data-probe-parent="order-management-page"
        data-probe-value={page}
        data-probe-linkage='{
          "targets": [{
            "id": "order-table",
            "effect": "data_reload",
            "path": { "type": "api", "url": "GET /api/orders?page=" }
          }]
        }'
      >
        <button onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </nav>

      {/* Action -- shortcut Ctrl+N opens the create modal */}
      <button
        data-probe-id="create-order-btn"
        data-probe-type="action"
        data-probe-state="idle"
        data-probe-parent="order-management-page"
        data-probe-shortcuts='[{"key":"Ctrl+N","action":"open-create-modal"}]'
        data-probe-linkage='{
          "targets": [{
            "id": "create-order-modal",
            "effect": "visibility_toggle",
            "path": { "type": "direct" }
          }]
        }'
        onClick={() => setModalOpen(true)}
      >
        Create Order
      </button>

      {/* Modal -- dialog with form, animation, and session tracking */}
      {modalOpen && (
        <dialog
          open
          data-probe-id="create-order-modal"
          data-probe-type="modal"
          data-probe-state={modalOpen ? 'open' : 'closed'}
          data-probe-animation='{"playing":true,"name":"fade-in","duration":200}'
          data-probe-children='["order-form"]'
        >
          <form
            data-probe-id="order-form"
            data-probe-type="form"
            data-probe-state="idle"
            data-probe-parent="create-order-modal"
            data-probe-session={JSON.stringify({ isDirty: formDirty, hasUnsavedChanges: formDirty })}
            data-probe-children='["customer-input","amount-input","tax-input"]'
          >
            <input
              data-probe-id="customer-input"
              data-probe-type="form"
              data-probe-state="idle"
              data-probe-parent="order-form"
              placeholder="Customer name"
              onChange={() => setFormDirty(true)}
            />
            <input
              data-probe-id="amount-input"
              data-probe-type="form"
              data-probe-state="idle"
              data-probe-parent="order-form"
              type="number"
              placeholder="Amount"
              onChange={() => setFormDirty(true)}
            />
            {/* tax-input is conditionally visible -- good candidate for isEffectivelyVisible */}
            <input
              data-probe-id="tax-input"
              data-probe-type="form"
              data-probe-state="idle"
              data-probe-parent="order-form"
              type="number"
              placeholder="Tax ID"
            />
            <button type="submit">Submit</button>
            <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
