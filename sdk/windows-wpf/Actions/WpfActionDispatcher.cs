using System.Windows;
using System.Windows.Automation.Peers;
using System.Windows.Automation.Provider;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using UITestProbe.Core.Actions;
using UITestProbe.Core.Collector;
using UITestProbe.Wpf.Collector;

namespace UITestProbe.Wpf.Actions;

/// <summary>
/// WPF-specific action dispatcher. Uses automation peers and direct
/// control manipulation to execute semantic actions.
/// </summary>
public class WpfActionDispatcher : ActionDispatcherBase
{
    private readonly WpfProbeRegistry _wpfRegistry;

    public WpfActionDispatcher(WpfProbeRegistry registry) : base(registry)
    {
        _wpfRegistry = registry;
    }

    public override async Task Click(string id)
    {
        PreFlightCheck(id);
        var native = _wpfRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is ButtonBase button)
        {
            var peer = UIElementAutomationPeer.CreatePeerForElement(button);
            if (peer.GetPattern(PatternInterface.Invoke) is IInvokeProvider invoker)
                invoker.Invoke();
        }
        else if (native is UIElement uiElement)
        {
            uiElement.RaiseEvent(new RoutedEventArgs(ButtonBase.ClickEvent));
        }

        var element = Registry.Query(id);
        if (element?.Linkage != null)
            await Task.Delay(100);
    }

    public override async Task Fill(string id, string value)
    {
        PreFlightCheck(id, "Form");
        var native = _wpfRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is TextBox textBox)
            textBox.Text = value;
        else if (native is RichTextBox richTextBox)
            richTextBox.Document.Blocks.Clear();
        else if (native is PasswordBox passwordBox)
            passwordBox.Password = value;
        else
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a WPF text input control.");

        await Task.CompletedTask;
    }

    public override async Task Select(string id, string value)
    {
        PreFlightCheck(id, "Selector");
        var native = _wpfRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Selector selector)
        {
            var match = selector.Items.Cast<object>().FirstOrDefault(i => i?.ToString() == value);
            if (match == null)
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found in selector '{id}'.");
            selector.SelectedItem = match;
        }
        else
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a WPF selector control.");

        await Task.CompletedTask;
    }
}
