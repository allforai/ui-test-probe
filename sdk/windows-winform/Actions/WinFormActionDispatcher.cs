using System.Reflection;
using System.Windows.Forms;
using UITestProbe.Core.Actions;
using UITestProbe.WinForms.Collector;

namespace UITestProbe.WinForms.Actions;

/// <summary>
/// WinForms-specific action dispatcher. Uses reflection and direct
/// control manipulation to execute semantic actions on WinForms controls.
/// </summary>
public class WinFormActionDispatcher : ActionDispatcherBase
{
    private readonly WinFormProbeRegistry _winFormRegistry;

    public WinFormActionDispatcher(WinFormProbeRegistry registry) : base(registry)
    {
        _winFormRegistry = registry;
    }

    public override async Task Click(string id)
    {
        PreFlightCheck(id);
        var native = _winFormRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Button button)
        {
            button.PerformClick();
        }
        else
        {
            // Use reflection to invoke OnClick for other controls
            var onClick = native.GetType().GetMethod("OnClick",
                BindingFlags.Instance | BindingFlags.NonPublic,
                null, new[] { typeof(EventArgs) }, null);
            onClick?.Invoke(native, new object[] { EventArgs.Empty });
        }

        var element = Registry.Query(id);
        if (element?.Linkage != null)
            await Task.Delay(100);
    }

    public override async Task Fill(string id, string value)
    {
        PreFlightCheck(id, "Form");
        var native = _winFormRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is TextBoxBase textBox)
            textBox.Text = value;
        else if (native is MaskedTextBox maskedTextBox)
            maskedTextBox.Text = value;
        else
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a WinForms text input control.");

        await Task.CompletedTask;
    }

    public override async Task Select(string id, string value)
    {
        PreFlightCheck(id, "Selector");
        var native = _winFormRegistry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is ComboBox comboBox)
        {
            var index = comboBox.Items.IndexOf(value);
            if (index < 0)
            {
                // Try string comparison
                index = Enumerable.Range(0, comboBox.Items.Count)
                    .FirstOrDefault(i => comboBox.Items[i]?.ToString() == value, -1);
            }
            if (index < 0)
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found in combobox '{id}'.");
            comboBox.SelectedIndex = index;
        }
        else if (native is ListBox listBox)
        {
            var index = listBox.Items.IndexOf(value);
            if (index < 0)
                index = Enumerable.Range(0, listBox.Items.Count)
                    .FirstOrDefault(i => listBox.Items[i]?.ToString() == value, -1);
            if (index < 0)
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found in listbox '{id}'.");
            listBox.SelectedIndex = index;
        }
        else
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a WinForms selector control.");

        await Task.CompletedTask;
    }
}
