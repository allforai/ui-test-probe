import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// probeProps — plain metadata objects read by the probe runtime in test builds.
// Production builds tree-shake the probe collector; probeProps become inert.

const ORDER_COLUMNS = [
  { id: 'orderId', label: 'Order ID', visible: true },
  { id: 'customer', label: 'Customer', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'amount', label: 'Amount', visible: true },
];

export default function OrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pageState, setPageState] = useState<string>('loading');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');

  const fetchOrders = useCallback(async () => {
    setPageState('loading');
    // ... fetch from GET /api/orders?status=...&page=...
    setOrders([]); // populated from response
    setPageState('loaded');
  }, [statusFilter, currentPage]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    // Page-level probe — tracks overall page state and child elements
    <View
      testID="order-management-page"
      probeProps={{ type: 'page', state: pageState }}
      style={styles.container}
    >
      {/* ── Status Filter ── */}
      {/* Selector with linkage: changing selection triggers data_reload on order-list */}
      <Picker
        testID="status-filter"
        probeProps={{
          type: 'selector',
          linkage: [{
            target: 'order-list',
            effect: 'data_reload',
            path: { type: 'api', url: 'GET /api/orders' },
          }],
        }}
        selectedValue={statusFilter}
        onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
      >
        <Picker.Item label="All" value="all" />
        <Picker.Item label="Pending" value="pending" />
        <Picker.Item label="Completed" value="completed" />
        <Picker.Item label="Cancelled" value="cancelled" />
      </Picker>

      {/* ── Order List ── */}
      {/* Data container with source binding — probe exposes row count, columns, */}
      {/* sort/filter state, and the API endpoint that feeds it. */}
      <FlatList
        testID="order-list"
        probeProps={{
          type: 'data-container',
          source: { url: 'GET /api/orders', method: 'GET' },
          state: pageState,
        }}
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.id}</Text>
            <Text>{item.customer}</Text>
            <Text>{item.status}</Text>
            <Text>${item.amount}</Text>
          </View>
        )}
      />

      {/* ── Paginator ── */}
      {/* Navigation with linkage to order-list — page change reloads data */}
      <View
        testID="order-paginator"
        probeProps={{
          type: 'navigation',
          state: 'loaded',
          linkage: [{
            target: 'order-list',
            effect: 'data_reload',
            path: { type: 'api', url: 'GET /api/orders' },
          }],
        }}
        style={styles.paginator}
      >
        <TouchableOpacity onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}>
          <Text>{'< Prev'}</Text>
        </TouchableOpacity>
        <Text>Page {currentPage}</Text>
        <TouchableOpacity onPress={() => setCurrentPage(currentPage + 1)}>
          <Text>{'Next >'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Create Order Button ── */}
      <TouchableOpacity
        testID="create-order-btn"
        probeProps={{ type: 'action' }}
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Create Order Modal ── */}
      {/* Modal with session tracking — detects unsaved form changes. */}
      {/* Animation metadata tracks slide-up transition. */}
      <Modal visible={modalVisible} animationType="slide" testID="create-order-modal">
        <View
          probeProps={{
            type: 'modal',
            state: modalVisible ? 'loaded' : 'hidden',
            animation: { name: 'slide-up' },
            session: { isDirty: customerName !== '' || amount !== '' },
          }}
          style={styles.modal}
        >
          <Text style={styles.title}>Create Order</Text>

          <TextInput
            testID="customer-input"
            probeProps={{ type: 'form', state: 'loaded' }}
            placeholder="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
          />
          <TextInput
            testID="amount-input"
            probeProps={{ type: 'form', state: 'loaded' }}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { /* submit */ setModalVisible(false); fetchOrders(); }}>
              <Text>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  paginator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 12 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 24 },
  modal: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});
