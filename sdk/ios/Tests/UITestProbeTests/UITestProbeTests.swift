import XCTest
@testable import UITestProbe

final class UITestProbeTests: XCTestCase {
    func testProbeElementCreation() {
        let element = ProbeElement(
            id: "test-button",
            type: .control,
            label: "Submit",
            state: ["enabled": "true"]
        )
        XCTAssertEqual(element.id, "test-button")
        XCTAssertEqual(element.type, .control)
        XCTAssertEqual(element.label, "Submit")
        XCTAssertTrue(element.isVisible)
        XCTAssertTrue(element.isEnabled)
    }

    func testLinkagePathCreation() {
        let path = LinkagePath(targetId: "result-list", effect: .refresh)
        XCTAssertEqual(path.targetId, "result-list")
        XCTAssertEqual(path.effect, .refresh)
        XCTAssertNil(path.condition)
    }
}
