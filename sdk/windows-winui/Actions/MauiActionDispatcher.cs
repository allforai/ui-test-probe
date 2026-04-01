using Microsoft.Maui.Controls;
using UITestProbe.Core.Actions;
using UITestProbe.WinUI.Collector;

namespace UITestProbe.WinUI.Actions;

/// <summary>
/// MAUI/WinUI-specific action dispatcher.
/// </summary>
public class MauiActionDispatcher : ActionDispatcherBase
{
    private readonly MauiProbeRegistry _mauiRegistry;

    public MauiActionDispatcher(MauiProbeRegistry registry) : base(registry)
    {
        _mauiRegistry = registry;
    }

    public override async Task Click(string id)
    {
        PreFlightCheck(id);
        var native = _mauiRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Button button)
            button.SendClicked();
        else if (native is ImageButton imageButton)
            imageButton.SendClicked();
        else
        {
            var tapGesture = native.GestureRecognizers.OfType<TapGestureRecognizer>().FirstOrDefault();
            if (tapGesture?.Command != null && tapGesture.Command.CanExecute(tapGesture.CommandParameter))
                tapGesture.Command.Execute(tapGesture.CommandParameter);
        }

        var element = Registry.Query(id);
        if (element?.Linkage != null) await Task.Delay(100);
    }

    public override async Task Fill(string id, string value)
    {
        PreFlightCheck(id, "Form");
        var native = _mauiRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Entry entry) entry.Text = value;
        else if (native is Editor editor) editor.Text = value;
        else if (native is SearchBar searchBar) searchBar.Text = value;
        else throw new ProbeActionException("UNSUPPORTED_CONTROL", id, $"Element '{id}' is not a MAUI text input.");

        await Task.CompletedTask;
    }

    public override async Task Select(string id, string value)
    {
        PreFlightCheck(id, "Selector");
        var native = _mauiRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Picker picker)
        {
            var index = picker.Items.IndexOf(value);
            if (index < 0)
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found. Available: [{string.Join(", ", picker.Items)}]");
            picker.SelectedIndex = index;
        }
        else if (native is ListView listView)
        {
            var match = listView.ItemsSource?.Cast<object>().FirstOrDefault(i => i?.ToString() == value);
            if (match != null) listView.SelectedItem = match;
            else throw new ProbeActionException("OPTION_NOT_FOUND", id, $"Option '{value}' not found in list '{id}'.");
        }
        else throw new ProbeActionException("UNSUPPORTED_CONTROL", id, $"Element '{id}' is not a MAUI selector.");

        await Task.CompletedTask;
    }
}
