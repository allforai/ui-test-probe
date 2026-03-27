// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "UITestProbeXCTest",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(
            name: "UITestProbeXCTest",
            targets: ["UITestProbeXCTest"]
        ),
    ],
    dependencies: [
        .package(path: "../../sdk/ios"),
    ],
    targets: [
        .target(
            name: "UITestProbeXCTest",
            dependencies: [
                .product(name: "UITestProbe", package: "ios"),
            ],
            path: "Sources/UITestProbeXCTest"
        ),
    ]
)
