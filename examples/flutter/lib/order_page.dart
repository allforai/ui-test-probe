import 'package:flutter/material.dart';
import 'package:ui_test_probe/ui_test_probe.dart';

/// Order Management Page — demonstrates ProbeWidget annotations.
/// Each key control is wrapped with ProbeWidget to expose its identity,
/// type, data source, and linkage to the test probe registry.
class OrderPage extends StatefulWidget {
  const OrderPage({super.key});

  @override
  State<OrderPage> createState() => _OrderPageState();
}

class _OrderPageState extends State<OrderPage> {
  String _statusFilter = 'all';
  int _currentPage = 1;
  bool _showCreateDialog = false;
  List<Map<String, dynamic>> _orders = [];
  String _pageState = 'loading';

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _pageState = 'loading');
    // ... fetch from API ...
    setState(() {
      _orders = []; // populated from response
      _pageState = 'loaded';
    });
  }

  @override
  Widget build(BuildContext context) {
    // Probe.page() — page-level wrapper that tracks overall page state
    // and automatically registers all child ProbeWidgets as descendants.
    return Probe.page(
      id: 'order-management-page',
      state: _pageState, // 'loading' | 'loaded' | 'error'
      child: Scaffold(
        appBar: AppBar(title: const Text('Order Management')),
        body: Column(
          children: [
            _buildToolbar(),
            Expanded(child: _buildOrderTable()),
            _buildPaginator(),
          ],
        ),
        // Modal — tracked with animation metadata for open/close transitions
        floatingActionButton: _buildCreateButton(),
      ),
    );
  }

  Widget _buildToolbar() {
    return Row(
      children: [
        // Status filter — selector with linkage to the order table.
        // When selection changes, it triggers a data_reload on 'order-table' via API.
        ProbeWidget(
          id: 'status-filter',
          type: ProbeType.selector,
          linkage: const [
            ProbeLinkage(
              target: 'order-table',
              effect: LinkageEffect.dataReload,
              path: LinkagePath.api(url: 'GET /api/orders'),
            ),
          ],
          child: DropdownButton<String>(
            value: _statusFilter,
            items: const [
              DropdownMenuItem(value: 'all', child: Text('All')),
              DropdownMenuItem(value: 'pending', child: Text('Pending')),
              DropdownMenuItem(value: 'completed', child: Text('Completed')),
              DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
            ],
            onChanged: (value) {
              setState(() => _statusFilter = value ?? 'all');
              _fetchOrders();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildOrderTable() {
    // Data container — exposes row count, column schema, sort/filter state,
    // and the API source that populates it.
    return ProbeWidget(
      id: 'order-table',
      type: ProbeType.dataContainer,
      source: const ProbeSource(url: 'GET /api/orders', method: 'GET'),
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Order ID')),
          DataColumn(label: Text('Customer')),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Amount')),
        ],
        rows: _orders.map((order) {
          return DataRow(cells: [
            DataCell(Text(order['id'] ?? '')),
            DataCell(Text(order['customer'] ?? '')),
            DataCell(Text(order['status'] ?? '')),
            DataCell(Text('\$${order['amount'] ?? 0}')),
          ]);
        }).toList(),
      ),
    );
  }

  Widget _buildPaginator() {
    // Navigation — paginator with linkage to order table.
    // Page change triggers data_reload on 'order-table'.
    return ProbeWidget(
      id: 'order-paginator',
      type: ProbeType.navigation,
      linkage: const [
        ProbeLinkage(
          target: 'order-table',
          effect: LinkageEffect.dataReload,
          path: LinkagePath.api(url: 'GET /api/orders'),
        ),
      ],
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: _currentPage > 1 ? () => _goToPage(_currentPage - 1) : null,
          ),
          Text('Page $_currentPage'),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _goToPage(_currentPage + 1),
          ),
        ],
      ),
    );
  }

  Widget _buildCreateButton() {
    // Action button — opens the create order modal
    return ProbeWidget(
      id: 'create-order-btn',
      type: ProbeType.action,
      child: FloatingActionButton(
        onPressed: () => _openCreateDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openCreateDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        // Modal — animation tracking for dialog open/close transitions.
        // Session tracking detects unsaved form changes.
        return ProbeWidget(
          id: 'create-order-modal',
          type: ProbeType.modal,
          animation: const ProbeAnimation(name: 'dialog-fade'),
          session: const ProbeSession(trackDirty: true),
          child: AlertDialog(
            title: const Text('Create Order'),
            content: _buildCreateForm(),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(onPressed: _submitOrder, child: const Text('Create')),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCreateForm() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Form fields — each tracked as ProbeType.form with validation errors
        ProbeWidget(
          id: 'customer-input',
          type: ProbeType.form,
          child: const TextField(decoration: InputDecoration(labelText: 'Customer Name')),
        ),
        ProbeWidget(
          id: 'amount-input',
          type: ProbeType.form,
          child: const TextField(
            decoration: InputDecoration(labelText: 'Amount'),
            keyboardType: TextInputType.number,
          ),
        ),
      ],
    );
  }

  void _goToPage(int page) {
    setState(() => _currentPage = page);
    _fetchOrders();
  }

  void _submitOrder() {
    // ... submit logic ...
    Navigator.pop(context);
    _fetchOrders();
  }
}
