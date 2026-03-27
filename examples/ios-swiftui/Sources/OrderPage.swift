import SwiftUI
import UITestProbe

// MARK: - Order Management Page

struct OrderPage: View {
    @StateObject private var viewModel = OrderViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // -- Toolbar --
            HStack {
                Text("Order Management")
                    .font(.title2.bold())

                Spacer()

                Button("Create Order") {
                    viewModel.showCreateDialog = true
                }
                .probeId("create-order-btn")
                .probeType(.action)
                .probeTrigger(.tap, opens: "create-order-modal")
            }
            .padding()

            // -- Status Filter --
            Picker("Status", selection: $viewModel.statusFilter) {
                Text("All").tag(OrderStatus?.none)
                ForEach(OrderStatus.allCases) { status in
                    Text(status.label).tag(Optional(status))
                }
            }
            .probeId("status-filter")
            .probeType(.selector)
            .probeLinkage(
                to: "order-table",
                effect: .dataReload,
                path: .api("GET /api/orders")
            )
            .padding(.horizontal)

            // -- Order Table --
            List(viewModel.orders) { order in
                OrderRow(order: order)
            }
            .probeId("order-table")
            .probeType(.dataContainer)
            .probeSource("GET /api/orders")
            .probeState(viewModel.tableState)
            .probeChildren(["order-row-*"])

            // -- Paginator --
            HStack {
                Button("Previous") { viewModel.prevPage() }
                    .disabled(viewModel.page <= 1)

                Text("Page \(viewModel.page) of \(viewModel.totalPages)")

                Button("Next") { viewModel.nextPage() }
                    .disabled(viewModel.page >= viewModel.totalPages)
            }
            .probeId("paginator")
            .probeType(.navigation)
            .probeLinkage(
                to: "order-table",
                effect: .dataReload,
                path: .api("GET /api/orders")
            )
            .padding()
        }
        .sheet(isPresented: $viewModel.showCreateDialog) {
            CreateOrderModal(viewModel: viewModel)
                .probeId("create-order-modal")
                .probeType(.modal)
        }
        .probeId("order-page")
        .probeType(.page)
        .onAppear { viewModel.loadOrders() }
    }
}

// MARK: - Order Row

struct OrderRow: View {
    let order: Order

    var body: some View {
        HStack {
            Text(order.id).fontWeight(.medium)
            Spacer()
            Text(order.customer)
            Spacer()
            Text(order.status.label)
                .foregroundColor(order.status.color)
            Spacer()
            Text(order.total, format: .currency(code: "USD"))
        }
        .probeId("order-row-\(order.id)")
        .probeType(.dataRow)
    }
}

// MARK: - Create Order Modal

struct CreateOrderModal: View {
    @ObservedObject var viewModel: OrderViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                TextField("Customer", text: $viewModel.draft.customer)
                    .probeId("input-customer")
                    .probeType(.formField)
                    .probeValidation(.required, message: "Customer is required")

                TextField("Amount", value: $viewModel.draft.total, format: .number)
                    .probeId("input-amount")
                    .probeType(.formField)
                    .probeValidation(.range(min: 0.01), message: "Must be > 0")
            }
            .probeId("create-order-form")
            .probeType(.form)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") { viewModel.submitOrder(); dismiss() }
                        .probeId("submit-order-btn")
                        .probeType(.action)
                        .probeLinkage(
                            to: "order-table",
                            effect: .dataReload,
                            path: .api("POST /api/orders")
                        )
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .navigationTitle("New Order")
        }
    }
}
