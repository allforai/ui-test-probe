// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "UITestProbe",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(
            name: "UITestProbe",
            targets: ["UITestProbe"]
        ),
    ],
    targets: [
        .target(
            name: "UITestProbe",
            path: "Sources/UITestProbe"
        ),
        .testTarget(
            name: "UITestProbeTests",
            dependencies: ["UITestProbe"],
            path: "Tests/UITestProbeTests"
        ),
    ]
)
