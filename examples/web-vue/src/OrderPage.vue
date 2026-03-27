<script setup lang="ts">
// Order Management Page -- UI Test Probe annotation reference (Vue 3)
// Annotations are identical to React: plain data-probe-* HTML attributes.
// Vue uses :data-probe-* (v-bind) for dynamic values.

import { ref, computed } from 'vue'

interface Order {
  id: string
  customer: string
  amount: number
  status: string
}

const status = ref('all')
const orders = ref<Order[]>([])
const page = ref(1)
const modalOpen = ref(false)
const formDirty = ref(false)

const tableState = computed(() => (orders.value.length ? 'loaded' : 'empty'))
</script>

<template>
  <!-- Page-level container -- probe hierarchy root -->
  <div
    data-probe-id="order-page"
    data-probe-type="page"
    data-probe-state="loaded"
    data-probe-children='["status-filter","order-table","order-paginator","create-order-btn"]'
  >
    <h1>Order Management</h1>

    <!-- Selector -- linked to order-table via API-backed data_reload -->
    <select
      v-model="status"
      data-probe-id="status-filter"
      data-probe-type="selector"
      data-probe-state="idle"
      data-probe-parent="order-page"
      data-probe-options='["all","pending","completed","cancelled"]'
      data-probe-linkage='{
        "targets": [{
          "id": "order-table",
          "effect": "data_reload",
          "path": { "type": "api", "url": "GET /api/orders" }
        }]
      }'
    >
      <option value="all">All</option>
      <option value="pending">Pending</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>

    <!-- Data container -- dynamic state via v-bind -->
    <table
      data-probe-id="order-table"
      data-probe-type="data-container"
      :data-probe-state="tableState"
      data-probe-parent="order-page"
      :data-probe-rows="orders.length"
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
        <tr v-for="o in orders" :key="o.id">
          <td>{{ o.id }}</td>
          <td>{{ o.customer }}</td>
          <td>{{ o.amount }}</td>
          <td>{{ o.status }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Navigation -- paginator linked to order-table -->
    <nav
      data-probe-id="order-paginator"
      data-probe-type="navigation"
      data-probe-state="idle"
      data-probe-parent="order-page"
      :data-probe-value="page"
      data-probe-linkage='{
        "targets": [{
          "id": "order-table",
          "effect": "data_reload",
          "path": { "type": "api", "url": "GET /api/orders?page=" }
        }]
      }'
    >
      <button @click="page = Math.max(1, page - 1)">Prev</button>
      <span>Page {{ page }}</span>
      <button @click="page++">Next</button>
    </nav>

    <!-- Action -- shortcut Ctrl+N opens modal -->
    <button
      data-probe-id="create-order-btn"
      data-probe-type="action"
      data-probe-state="idle"
      data-probe-parent="order-page"
      data-probe-shortcuts='[{"key":"Ctrl+N","action":"open-create-modal"}]'
      data-probe-linkage='{
        "targets": [{
          "id": "create-order-modal",
          "effect": "visibility_toggle",
          "path": { "type": "direct" }
        }]
      }'
      @click="modalOpen = true"
    >
      Create Order
    </button>

    <!-- Modal -- with animation and session tracking -->
    <dialog
      v-if="modalOpen"
      open
      data-probe-id="create-order-modal"
      data-probe-type="modal"
      :data-probe-state="modalOpen ? 'open' : 'closed'"
      data-probe-animation='{"playing":true,"name":"fade-in","duration":200}'
      data-probe-children='["order-form"]'
    >
      <form
        data-probe-id="order-form"
        data-probe-type="form"
        data-probe-state="idle"
        data-probe-parent="create-order-modal"
        :data-probe-session="JSON.stringify({ isDirty: formDirty, hasUnsavedChanges: formDirty })"
        data-probe-children='["customer-input","amount-input","tax-input"]'
      >
        <input
          data-probe-id="customer-input"
          data-probe-type="form"
          data-probe-state="idle"
          data-probe-parent="order-form"
          placeholder="Customer name"
          @input="formDirty = true"
        />
        <input
          data-probe-id="amount-input"
          data-probe-type="form"
          data-probe-state="idle"
          data-probe-parent="order-form"
          type="number"
          placeholder="Amount"
          @input="formDirty = true"
        />
        <input
          data-probe-id="tax-input"
          data-probe-type="form"
          data-probe-state="idle"
          data-probe-parent="order-form"
          type="number"
          placeholder="Tax ID"
        />
        <button type="submit">Submit</button>
        <button type="button" @click="modalOpen = false">Cancel</button>
      </form>
    </dialog>
  </div>
</template>
