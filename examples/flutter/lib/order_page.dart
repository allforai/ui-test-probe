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
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoading = true);
    // Simulate API fetch
    await Future.delayed(const Duration(milliseconds: 100));
    setState(() {
      _orders = [
        {'id': 'ORD-001', 'customer': 'Acme Corp', 'status': 'completed', 'amount': 1500},
        {'id': 'ORD-002', 'customer': 'Widget Inc', 'status': 'pending', 'amount': 3200},
        {'id': 'ORD-003', 'customer': 'Foo Bar LLC', 'status': 'cancelled', 'amount': 800},
      ];
      if (_statusFilter != 'all') {
        _orders = _orders.where((o) => o['status'] == _statusFilter).toList();
      }
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ProbeWidget(
      id: 'order-management-page',
      type: ProbeType.page,
      state: {'current': _isLoading ? 'loading' : 'loaded'},
      child: Scaffold(
        appBar: AppBar(title: const Text('Order Management')),
        body: Column(
          children: [
            _buildToolbar(),
            Expanded(child: _buildOrderTable()),
            _buildPaginator(),
          ],
        ),
        floatingActionButton: _buildCreateButton(),
      ),
    );
  }

  Widget _buildToolbar() {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Row(
        children: [
          ProbeWidget(
            id: 'status-filter',
            type: ProbeType.selector,
            state: {'current': 'loaded', 'value': _statusFilter},
            linkage: [
              LinkagePath(
                targetId: 'order-table',
                effect: LinkageEffect.dataReload,
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
      ),
    );
  }

  Widget _buildOrderTable() {
    return ProbeWidget(
      id: 'order-table',
      type: ProbeType.dataContainer,
      source: 'GET /api/orders',
      state: {
        'current': _isLoading ? 'loading' : 'loaded',
        'rows': _orders.length,
      },
      child: SingleChildScrollView(
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
      ),
    );
  }

  Widget _buildPaginator() {
    return ProbeWidget(
      id: 'order-paginator',
      type: ProbeType.navigation,
      state: {'current': 'loaded', 'page': _currentPage},
      linkage: [
        LinkagePath(
          targetId: 'order-table',
          effect: LinkageEffect.dataReload,
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
    return ProbeWidget(
      id: 'create-order-btn',
      type: ProbeType.action,
      state: const {'current': 'loaded'},
      child: FloatingActionButton(
        onPressed: _openCreateDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openCreateDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return ProbeWidget(
          id: 'create-order-modal',
          type: ProbeType.modal,
          state: const {'current': 'loaded', 'isOpen': true},
          child: AlertDialog(
            title: const Text('Create Order'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ProbeWidget(
                  id: 'customer-input',
                  type: ProbeType.form,
                  state: const {'current': 'loaded'},
                  child: const TextField(
                    decoration: InputDecoration(labelText: 'Customer Name'),
                  ),
                ),
                ProbeWidget(
                  id: 'amount-input',
                  type: ProbeType.form,
                  state: const {'current': 'loaded'},
                  child: const TextField(
                    decoration: InputDecoration(labelText: 'Amount'),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _fetchOrders();
                },
                child: const Text('Create'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _goToPage(int page) {
    setState(() => _currentPage = page);
    _fetchOrders();
  }
}
