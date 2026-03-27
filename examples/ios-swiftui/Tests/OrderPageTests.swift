import XCTest
import UITestProbe

final class OrderPageTests: XCTestCase {
    var app: XCUIApplication!
    var probe: ProbeXCTest!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        probe = ProbeXCTest(app)
    }

    // MARK: - Page Load

    func testPageReady() throws {
        probe.waitForPageReady(timeout: 5)

        let page = probe.query("order-page")
        XCTAssertEqual(page.type, .page)
        XCTAssertTrue(page.isReady)
    }

    func testOrderTableLoaded() throws {
        probe.waitForPageReady()

        let table = probe.query("order-table")
        XCTAssertEqual(table.type, .dataContainer)
        XCTAssertEqual(table.state, .loaded)
        XCTAssertGreaterThan(table.childCount, 0, "Table should have rows")
        XCTAssertEqual(table.source, "GET /api/orders")
    }

    // MARK: - Filter Linkage

    func testStatusFilterReloadsTable() throws {
        probe.waitForPageReady()

        // Act: select a filter value, wait for the linked target to reload
        probe.actAndWait(
            "status-filter",
            action: .select("completed"),
            target: "order-table",
            state: "loaded"
        )

        let table = probe.query("order-table")
        XCTAssertEqual(table.state, .loaded)
    }

    func testFilterLinkageMetadata() throws {
        probe.waitForPageReady()

        let linkage = probe.verifyLinkage(
            "status-filter",
            action: .select("completed")
        )
        XCTAssertEqual(linkage.target, "order-table")
        XCTAssertEqual(linkage.effect, .dataReload)
        XCTAssertEqual(linkage.apiPath, "GET /api/orders")
    }

    // MARK: - Pagination

    func testPaginatorNavigation() throws {
        probe.waitForPageReady()

        let firstRows = probe.query("order-table").childCount

        probe.actAndWait(
            "paginator",
            action: .tap("next"),
            target: "order-table",
            state: "loaded"
        )

        let table = probe.query("order-table")
        XCTAssertEqual(table.state, .loaded)
        // Page changed so content may differ
        XCTAssertGreaterThan(table.childCount, 0)
    }

    // MARK: - Create Order Modal

    func testCreateOrderFlow() throws {
        probe.waitForPageReady()

        // Open modal
        probe.tap("create-order-btn")
        probe.waitFor("create-order-modal", state: .visible)

        let modal = probe.query("create-order-modal")
        XCTAssertEqual(modal.type, .modal)

        // Fill form
        probe.fill("input-customer", value: "Acme Corp")
        probe.fill("input-amount", value: "1500.00")

        // Submit and wait for table reload
        probe.actAndWait(
            "submit-order-btn",
            action: .tap(),
            target: "order-table",
            state: "loaded"
        )

        // Modal should be dismissed
        XCTAssertFalse(probe.isVisible("create-order-modal"))
    }

    func testFormValidation() throws {
        probe.waitForPageReady()
        probe.tap("create-order-btn")
        probe.waitFor("create-order-modal", state: .visible)

        // Submit with empty fields
        probe.tap("submit-order-btn")

        let customerField = probe.query("input-customer")
        XCTAssertTrue(customerField.hasValidationError)
        XCTAssertEqual(customerField.validationMessage, "Customer is required")
    }

    // MARK: - Visibility

    func testElementVisibility() throws {
        probe.waitForPageReady()

        XCTAssertTrue(probe.isEffectivelyVisible("order-table"))
        XCTAssertTrue(probe.isEffectivelyVisible("status-filter"))
        XCTAssertFalse(probe.isEffectivelyVisible("create-order-modal"))
    }

    // MARK: - Device Presets

    func testResponsiveLayout_iPhone() throws {
        probe.setDevice(.iPhone15Pro)
        probe.waitForPageReady()

        XCTAssertTrue(probe.isEffectivelyVisible("order-table"))
        XCTAssertTrue(probe.isEffectivelyVisible("paginator"))
    }

    func testResponsiveLayout_iPad() throws {
        probe.setDevice(.iPadAir)
        probe.waitForPageReady()

        XCTAssertTrue(probe.isEffectivelyVisible("order-table"))
        XCTAssertTrue(probe.isEffectivelyVisible("status-filter"))
    }
}
