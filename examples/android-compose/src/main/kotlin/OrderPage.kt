package com.example.orders.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.uitestprobe.compose.*

// MARK: Order Management Page

@Composable
fun OrderPage(viewModel: OrderViewModel = viewModel()) {
    val orders by viewModel.orders.collectAsState()
    val tableState by viewModel.tableState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .probeId("order-page")
            .probeType(ProbeType.PAGE)
    ) {
        // -- Toolbar --
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Order Management", style = MaterialTheme.typography.headlineSmall)

            Button(
                onClick = { showCreateDialog = true },
                modifier = Modifier
                    .probeId("create-order-btn")
                    .probeType(ProbeType.ACTION)
                    .probeTrigger(TriggerType.CLICK, opens = "create-order-modal")
            ) {
                Text("Create Order")
            }
        }

        // -- Status Filter --
        StatusFilterDropdown(
            selected = viewModel.statusFilter,
            onSelect = { viewModel.setFilter(it) },
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .probeId("status-filter")
                .probeType(ProbeType.SELECTOR)
                .probeLinkage(
                    target = "order-table",
                    effect = LinkageEffect.DATA_RELOAD,
                    path = ApiPath("GET /api/orders")
                )
        )

        // -- Order Table --
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .probeId("order-table")
                .probeType(ProbeType.DATA_CONTAINER)
                .probeSource("GET /api/orders")
                .probeState(tableState)
                .probeChildren("order-row-*")
        ) {
            items(orders, key = { it.id }) { order ->
                OrderRow(
                    order = order,
                    modifier = Modifier
                        .probeId("order-row-${order.id}")
                        .probeType(ProbeType.DATA_ROW)
                )
            }
        }

        // -- Paginator --
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .probeId("paginator")
                .probeType(ProbeType.NAVIGATION)
                .probeLinkage(
                    target = "order-table",
                    effect = LinkageEffect.DATA_RELOAD,
                    path = ApiPath("GET /api/orders")
                ),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = { viewModel.prevPage() },
                enabled = viewModel.page > 1
            ) { Text("Previous") }

            Text("Page ${viewModel.page} of ${viewModel.totalPages}")

            TextButton(
                onClick = { viewModel.nextPage() },
                enabled = viewModel.page < viewModel.totalPages
            ) { Text("Next") }
        }
    }

    // -- Create Order Modal --
    if (showCreateDialog) {
        CreateOrderDialog(
            onDismiss = { showCreateDialog = false },
            onSubmit = { draft ->
                viewModel.submitOrder(draft)
                showCreateDialog = false
            },
            modifier = Modifier
                .probeId("create-order-modal")
                .probeType(ProbeType.MODAL)
        )
    }
}

@Composable
private fun CreateOrderDialog(
    onDismiss: () -> Unit,
    onSubmit: (OrderDraft) -> Unit,
    modifier: Modifier = Modifier
) {
    var customer by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier,
        title = { Text("New Order") },
        text = {
            Column(
                modifier = Modifier
                    .probeId("create-order-form")
                    .probeType(ProbeType.FORM)
            ) {
                OutlinedTextField(
                    value = customer,
                    onValueChange = { customer = it },
                    label = { Text("Customer") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .probeId("input-customer")
                        .probeType(ProbeType.FORM_FIELD)
                        .probeValidation(ValidationType.REQUIRED, "Customer is required")
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .probeId("input-amount")
                        .probeType(ProbeType.FORM_FIELD)
                        .probeValidation(ValidationType.RANGE_MIN, "Must be > 0", min = 0.01)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(OrderDraft(customer, amount.toDoubleOrNull() ?: 0.0)) },
                modifier = Modifier
                    .probeId("submit-order-btn")
                    .probeType(ProbeType.ACTION)
                    .probeLinkage(
                        target = "order-table",
                        effect = LinkageEffect.DATA_RELOAD,
                        path = ApiPath("POST /api/orders")
                    )
            ) { Text("Submit") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
