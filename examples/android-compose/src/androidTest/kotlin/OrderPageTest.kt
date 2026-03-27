package com.example.orders.ui

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.uitestprobe.compose.test.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class OrderPageTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    private lateinit var probeRule: ProbeTestRule

    @Before
    fun setup() {
        probeRule = ProbeTestRule(composeRule)
    }

    // -- Page Load --

    @Test
    fun pageReady() {
        probeRule.waitForPageReady(timeoutMs = 5000)

        val page = probeRule.query("order-page")
        assert(page.type == ProbeType.PAGE)
        assert(page.isReady)
    }

    @Test
    fun orderTableLoaded() {
        probeRule.waitForPageReady()

        val table = probeRule.query("order-table")
        assert(table.type == ProbeType.DATA_CONTAINER)
        assert(table.state == ProbeState.LOADED)
        assert(table.childCount > 0) { "Table should have rows" }
        assert(table.source == "GET /api/orders")
    }

    // -- Filter Linkage --

    @Test
    fun statusFilterReloadsTable() {
        probeRule.waitForPageReady()

        probeRule.actAndWait(
            probeId = "status-filter",
            action = "select:completed",
            target = "order-table",
            expectedState = "loaded"
        )

        val table = probeRule.query("order-table")
        assert(table.state == ProbeState.LOADED)
    }

    @Test
    fun filterLinkageMetadata() {
        probeRule.waitForPageReady()

        val linkage = probeRule.verifyLinkage(
            probeId = "status-filter",
            action = "select:completed"
        )
        assert(linkage.target == "order-table")
        assert(linkage.effect == LinkageEffect.DATA_RELOAD)
        assert(linkage.apiPath == "GET /api/orders")
    }

    // -- Pagination --

    @Test
    fun paginatorNavigation() {
        probeRule.waitForPageReady()

        probeRule.actAndWait(
            probeId = "paginator",
            action = "tap:next",
            target = "order-table",
            expectedState = "loaded"
        )

        val table = probeRule.query("order-table")
        assert(table.state == ProbeState.LOADED)
        assert(table.childCount > 0)
    }

    // -- Create Order Modal --

    @Test
    fun createOrderFlow() {
        probeRule.waitForPageReady()

        probeRule.tap("create-order-btn")
        probeRule.waitFor("create-order-modal", state = ProbeState.VISIBLE)

        val modal = probeRule.query("create-order-modal")
        assert(modal.type == ProbeType.MODAL)

        probeRule.fill("input-customer", "Acme Corp")
        probeRule.fill("input-amount", "1500.00")

        probeRule.actAndWait(
            probeId = "submit-order-btn",
            action = "tap",
            target = "order-table",
            expectedState = "loaded"
        )

        assert(!probeRule.isVisible("create-order-modal"))
    }

    @Test
    fun formValidation() {
        probeRule.waitForPageReady()
        probeRule.tap("create-order-btn")
        probeRule.waitFor("create-order-modal", state = ProbeState.VISIBLE)

        probeRule.tap("submit-order-btn")

        val customerField = probeRule.query("input-customer")
        assert(customerField.hasValidationError)
        assert(customerField.validationMessage == "Customer is required")
    }

    // -- Visibility --

    @Test
    fun elementVisibility() {
        probeRule.waitForPageReady()

        assert(probeRule.isEffectivelyVisible("order-table"))
        assert(probeRule.isEffectivelyVisible("status-filter"))
        assert(!probeRule.isEffectivelyVisible("create-order-modal"))
    }

    // -- Device Presets --

    @Test
    fun responsiveLayout_phone() {
        probeRule.setDevice(DevicePreset.PIXEL_8)
        probeRule.waitForPageReady()

        assert(probeRule.isEffectivelyVisible("order-table"))
        assert(probeRule.isEffectivelyVisible("paginator"))
    }

    @Test
    fun responsiveLayout_tablet() {
        probeRule.setDevice(DevicePreset.PIXEL_TABLET)
        probeRule.waitForPageReady()

        assert(probeRule.isEffectivelyVisible("order-table"))
        assert(probeRule.isEffectivelyVisible("status-filter"))
    }
}
