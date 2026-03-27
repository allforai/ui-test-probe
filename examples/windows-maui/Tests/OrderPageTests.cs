using Microsoft.VisualStudio.TestTools.UnitTesting;
using UITestProbe.Net;

namespace OrderApp.Tests;

[TestClass]
public class OrderPageTests
{
    private ProbeDriver probe = null!;

    [TestInitialize]
    public void Setup()
    {
        var app = AppDriver.Launch<App>();
        probe = new ProbeDriver(app);
    }

    // -- Page Load --

    [TestMethod]
    public void PageReady()
    {
        probe.WaitForPageReady(timeoutMs: 5000);

        var page = probe.Query("order-page");
        Assert.AreEqual(ProbeType.Page, page.Type);
        Assert.IsTrue(page.IsReady);
    }

    [TestMethod]
    public void OrderTableLoaded()
    {
        probe.WaitForPageReady();

        var table = probe.Query("order-table");
        Assert.AreEqual(ProbeType.DataContainer, table.Type);
        Assert.AreEqual(ProbeState.Loaded, table.State);
        Assert.IsTrue(table.ChildCount > 0, "Table should have rows");
        Assert.AreEqual("GET /api/orders", table.Source);
    }

    // -- Filter Linkage --

    [TestMethod]
    public void StatusFilterReloadsTable()
    {
        probe.WaitForPageReady();

        probe.ActAndWait(
            probeId: "status-filter",
            action: "select:completed",
            target: "order-table",
            expectedState: "loaded"
        );

        var table = probe.Query("order-table");
        Assert.AreEqual(ProbeState.Loaded, table.State);
    }

    [TestMethod]
    public void FilterLinkageMetadata()
    {
        probe.WaitForPageReady();

        var linkage = probe.VerifyLinkage(
            probeId: "status-filter",
            action: "select:completed"
        );
        Assert.AreEqual("order-table", linkage.Target);
        Assert.AreEqual(LinkageEffect.DataReload, linkage.Effect);
        Assert.AreEqual("GET /api/orders", linkage.ApiPath);
    }

    // -- Pagination --

    [TestMethod]
    public void PaginatorNavigation()
    {
        probe.WaitForPageReady();

        probe.ActAndWait(
            probeId: "paginator",
            action: "tap:next",
            target: "order-table",
            expectedState: "loaded"
        );

        var table = probe.Query("order-table");
        Assert.AreEqual(ProbeState.Loaded, table.State);
        Assert.IsTrue(table.ChildCount > 0);
    }

    // -- Create Order Modal --

    [TestMethod]
    public void CreateOrderFlow()
    {
        probe.WaitForPageReady();

        probe.Tap("create-order-btn");
        probe.WaitFor("create-order-modal", ProbeState.Visible);

        var modal = probe.Query("create-order-modal");
        Assert.AreEqual(ProbeType.Modal, modal.Type);

        probe.Fill("input-customer", "Acme Corp");
        probe.Fill("input-amount", "1500.00");

        probe.ActAndWait(
            probeId: "submit-order-btn",
            action: "tap",
            target: "order-table",
            expectedState: "loaded"
        );

        Assert.IsFalse(probe.IsVisible("create-order-modal"));
    }

    [TestMethod]
    public void FormValidation()
    {
        probe.WaitForPageReady();
        probe.Tap("create-order-btn");
        probe.WaitFor("create-order-modal", ProbeState.Visible);

        probe.Tap("submit-order-btn");

        var customerField = probe.Query("input-customer");
        Assert.IsTrue(customerField.HasValidationError);
        Assert.AreEqual("Customer is required", customerField.ValidationMessage);
    }

    // -- Visibility --

    [TestMethod]
    public void ElementVisibility()
    {
        probe.WaitForPageReady();

        Assert.IsTrue(probe.IsEffectivelyVisible("order-table"));
        Assert.IsTrue(probe.IsEffectivelyVisible("status-filter"));
        Assert.IsFalse(probe.IsEffectivelyVisible("create-order-modal"));
    }

    // -- Device Presets --

    [TestMethod]
    public void ResponsiveLayout_Desktop()
    {
        probe.SetDevice(DevicePreset.Desktop1080p);
        probe.WaitForPageReady();

        Assert.IsTrue(probe.IsEffectivelyVisible("order-table"));
        Assert.IsTrue(probe.IsEffectivelyVisible("status-filter"));
    }

    [TestMethod]
    public void ResponsiveLayout_DesktopWide()
    {
        probe.SetDevice(DevicePreset.Desktop1440p);
        probe.WaitForPageReady();

        Assert.IsTrue(probe.IsEffectivelyVisible("order-table"));
        Assert.IsTrue(probe.IsEffectivelyVisible("paginator"));
    }
}
