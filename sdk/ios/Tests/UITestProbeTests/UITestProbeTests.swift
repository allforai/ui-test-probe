import XCTest
@testable import UITestProbe

final class UITestProbeTests: XCTestCase {
    func testProbeElementCreation() {
        let element = ProbeElement(
            id: "test-button",
            type: .action,
            label: "Submit",
            state: ["enabled": "true"]
        )
        XCTAssertEqual(element.id, "test-button")
        XCTAssertEqual(element.type, .action)
        XCTAssertEqual(element.label, "Submit")
        XCTAssertTrue(element.isVisible)
        XCTAssertTrue(element.isEnabled)
    }

    func testLinkagePathCreation() {
        let path = LinkagePath(targetId: "result-list", effect: .dataReload)
        XCTAssertEqual(path.targetId, "result-list")
        XCTAssertEqual(path.effect, .dataReload)
        XCTAssertNil(path.condition)
    }
}
