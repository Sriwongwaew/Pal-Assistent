// PalAssistent – launchern som gör webbappen till ett program på datorn.
//
// Kompileras med csc.exe som redan finns i varje Windows (.NET Framework 4),
// alltså utan någon verktygskedja att installera. /target:winexe = inget
// konsolfönster.
//
// Vad den gör, i ordning:
//   1. Ser till att bara en instans kör. Startas programmet igen öppnas bara
//      fönstret på nytt mot den server som redan är igång.
//   2. Väljer en ledig port och startar den medföljande node.exe med server.js.
//   3. Väntar tills servern faktiskt svarar på HTTP – inte bara att porten är
//      bunden, för då hinner fönstret öppnas mot en halvstartad server.
//   4. Öppnar Edge i app-läge: eget fönster, ingen adressrad, egen ikon i
//      aktivitetsfältet.
//   5. Stänger användaren fönstret avslutas servern med.
//
// Fyra detaljer som ser onödiga ut men inte är det:
//
// * Vi väntar på FÖNSTRET, aldrig på msedge-processen. Chromium är ett tjugotal
//   processer och den vi startar är sällan den som blir kvar – finns redan en
//   Edge på profilen lämnar den nystartade över och avslutar direkt. Väntade vi
//   på den skulle servern dödas i samma sekund som den startat.
// * `--user-data-dir` ger appen en egen profil, alltså ett eget fönster och en
//   egen ikon i aktivitetsfältet i stället för en flik i användarens vanliga
//   Edge. Egen profil är däremot INTE samma sak som tom profil: på en dator med
//   jobbkonto loggar Edge in sig själv och synkar ner användarens alla tillägg
//   i den. Därför `--disable-extensions` – se ShowWindow.
// * Fönsterkollen går igenom alla toppnivåfönster, inte Process.MainWindowTitle.
//   Skälet står vid AppWindowExists och det har kostat en app som stängde sig
//   själv några sekunder efter start.
// * Job-objektet med KILL_ON_JOB_CLOSE tar både node.exe och hela Edge-trädet
//   i graven när launchern dör, hur den än dör. Utan det ligger en osynlig
//   server kvar och äter minne, och kvarglömda renderarprocesser på profilen
//   orsakar överlämningen ovan nästa gång programmet startas.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class Program
{
    private const string AppName = "PalAssistent";
    /// Global\ så instanskollen gäller hela sessionen, inte bara en terminal.
    private const string MutexName = @"Global\PalAssistentSingleInstance";
    /// Portar vi helst tar. 3000 är medvetet undviket – det är utvecklingsservern.
    private const int PortFirst = 3123;
    private const int PortLast = 3199;
    /// Kallstart av Next tar ett par sekunder; 90 s är för en trött disk.
    private const int ReadyTimeoutMs = 90000;

    private static string AppDir
    {
        get { return AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\'); }
    }

    /// Portfilen och webbläsarprofilen hör till användaren, inte till programmet,
    /// och får därför aldrig ligga i installationsmappen.
    private static string StateDir
    {
        get
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                AppName);
        }
    }

    private static string PortFile { get { return Path.Combine(StateDir, "port"); } }
    private static string BrowserProfile { get { return Path.Combine(StateDir, "browser"); } }

    /// Där /api/update/install lägger sin nedladdade installer och sitt skript.
    /// Samma sökväg finns i route.ts – ändras den ena måste den andra med.
    private static string UpdateDir { get { return Path.Combine(StateDir, "update"); } }
    private static string UpdateScript { get { return Path.Combine(UpdateDir, "uppdatera.cmd"); } }

    [STAThread]
    private static int Main()
    {
        bool first;
        using (var mutex = new Mutex(true, MutexName, out first))
        {
            if (!first)
            {
                ReopenRunning();
                return 0;
            }
            try
            {
                return Run();
            }
            catch (Exception ex)
            {
                Fail("Något gick fel när PalAssistent skulle startas.\n\n" + ex.Message);
                return 1;
            }
        }
    }

    // ------------------------------------------------------------------ start

    private static int Run()
    {
        string node = Path.Combine(AppDir, "node", "node.exe");
        string server = Path.Combine(AppDir, "server.js");
        if (!File.Exists(node) || !File.Exists(server))
        {
            Fail("Installationen ser ofullständig ut – hittar inte serverfilerna.\n\n" +
                 "Installera om PalAssistent.");
            return 1;
        }

        Directory.CreateDirectory(StateDir);

        // Tidsstämpeln avgör senare om en väntande uppdatering hör till den här
        // körningen eller är en rest från en avbruten. Se RunPendingUpdate.
        DateTime startedUtc = Process.GetCurrentProcess().StartTime.ToUniversalTime();

        int port = FindFreePort();
        if (port == 0)
        {
            Fail("Hittar ingen ledig port på datorn. Starta om och försök igen.");
            return 1;
        }

        var log = new StringBuilder();
        Process serverProcess = StartServer(node, server, port, log);
        IntPtr job = CreateKillOnCloseJob();
        if (job != IntPtr.Zero) AssignProcessToJobObject(job, serverProcess.Handle);

        try
        {
            if (!WaitForServer(port, serverProcess))
            {
                string detail = log.ToString().Trim();
                Fail("PalAssistent kunde inte starta." +
                     (detail.Length > 0 ? "\n\n" + Tail(detail, 600) : ""));
                return 1;
            }

            File.WriteAllText(PortFile, port.ToString());
            ShowWindow(port, job, serverProcess);
            return 0;
        }
        finally
        {
            StopServer(serverProcess);
            try { File.Delete(PortFile); } catch { }
            if (job != IntPtr.Zero) CloseHandle(job);
            // Sist av allt, och med flit: nu är servern död, fönstret stängt och
            // job-objektet borta. Se RunPendingUpdate för varför ordningen är hela
            // poängen.
            RunPendingUpdate(startedUtc);
        }
    }

    /// Kör uppdateringsskriptet som /api/update/install lagt ut, om det finns.
    ///
    /// DET HÄR ÄR ENDA STÄLLET BYTET FÅR STARTAS IFRÅN. Servern kan inte göra det
    /// själv, hur naturligt det än vore: node.exe ligger i job-objektet ovan, och
    /// allt node startar ärver medlemskapet – `detached` hjälper inte, ett jobb
    /// följer med barnen. När launchern sedan släpper handtaget dödar
    /// KILL_ON_JOB_CLOSE hela släktet, alltså också installern mitt i
    /// installationen. Symptomet är precis det man inte gissar på: appen stängs,
    /// ingenting installeras, och nästa start är samma version. Launchern är
    /// däremot inte själv medlem i jobbet, så det den startar går fritt.
    ///
    /// Skriptet får sökvägen till programmet som miljövariabel i stället för
    /// inbakad i sin text: en .cmd läses i datorns OEM-teckentabell, så ett
    /// användarnamn med å, ä eller ö i sökvägen hade blivit obegripligt för cmd.
    /// Miljövariabler går som Unicode hela vägen.
    private static void RunPendingUpdate(DateTime launcherStartUtc)
    {
        try
        {
            if (!File.Exists(UpdateScript)) return;

            // Skriptet ska ha skrivits av den server vi just körde. Ett äldre är
            // en rest från en uppdatering som avbröts, och att köra en gammal
            // installer vid nästa vanliga avslut vore både förvirrande och fel.
            if (File.GetLastWriteTimeUtc(UpdateScript) < launcherStartUtc)
            {
                try { Directory.Delete(UpdateDir, true); } catch { }
                return;
            }

            var info = new ProcessStartInfo("cmd.exe", "/c \"" + UpdateScript + "\"")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = StateDir,
            };
            info.EnvironmentVariables["PA_APP_EXE"] = Path.Combine(AppDir, AppName + ".exe");
            Process.Start(info);
        }
        catch
        {
            // Går det inte att starta bytet är appen oförändrad och fungerar. En
            // ruta om det här, efter att fönstret redan stängts, vore ett spöke.
        }
    }

    private static Process StartServer(string node, string server, int port, StringBuilder log)
    {
        var info = new ProcessStartInfo(node, "\"" + server + "\"")
        {
            WorkingDirectory = AppDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
        };
        // Servern binder bara loopback. Rutterna som läser saven tar en godtycklig
        // mapp, så den får aldrig råka bli nåbar från nätverket.
        info.EnvironmentVariables["PORT"] = port.ToString();
        info.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
        info.EnvironmentVariables["NODE_ENV"] = "production";
        // Talar om för uppdateringsrutten att det här är den installerade appen
        // och inte någons arbetskopia. Utan den vägrar den installera.
        info.EnvironmentVariables["PA_PACKAGED"] = "1";

        var process = new Process { StartInfo = info };
        DataReceivedEventHandler collect = (s, e) =>
        {
            if (e.Data != null) lock (log) { log.AppendLine(e.Data); }
        };
        process.OutputDataReceived += collect;
        process.ErrorDataReceived += collect;
        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return process;
    }

    /// Väntar på ett riktigt HTTP-svar. Att porten är bunden räcker inte – Next
    /// hinner lyssna innan den kan svara, och då möts användaren av en tom sida.
    private static bool WaitForServer(int port, Process serverProcess)
    {
        string url = "http://127.0.0.1:" + port + "/";
        var clock = Stopwatch.StartNew();
        while (clock.ElapsedMilliseconds < ReadyTimeoutMs)
        {
            if (serverProcess.HasExited) return false;
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 2000;
                request.Method = "HEAD";
                using ((HttpWebResponse)request.GetResponse()) { return true; }
            }
            catch (WebException ex)
            {
                // Ett felsvar betyder ändå att någon svarar – servern lever.
                if (ex.Response != null) return true;
            }
            catch { }
            Thread.Sleep(250);
        }
        return false;
    }

    private static void StopServer(Process serverProcess)
    {
        try
        {
            if (!serverProcess.HasExited)
            {
                serverProcess.Kill();
                serverProcess.WaitForExit(5000);
            }
        }
        catch { }
    }

    // ----------------------------------------------------------------- fönster

    /// Öppnar app-fönstret och blockerar tills användaren stänger det.
    ///
    /// Vi väntar på FÖNSTRET, inte på processen. Chromium är inte en process utan
    /// ett tjugotal, och den msedge.exe vi startar är sällan den som blir kvar:
    /// finns redan en Edge på profilen lämnar den nystartade över och avslutar
    /// direkt. Väntade vi på den skulle servern dödas i samma sekund som den
    /// startat. Fönstret finns däremot exakt så länge användaren har appen öppen.
    ///
    /// Edge läggs dessutom i samma job-objekt som servern, så hela processträdet
    /// städas när launchern dör. Utan det blir renderarprocesser kvar på profilen
    /// och orsakar precis den överlämning som beskrivs ovan nästa gång.
    private static void ShowWindow(int port, IntPtr job, Process server)
    {
        string url = "http://127.0.0.1:" + port + "/";
        string edge = FindEdge();

        if (edge != null)
        {
            var info = new ProcessStartInfo(edge, string.Join(" ", new[]
            {
                "--app=" + url,
                "--user-data-dir=\"" + BrowserProfile + "\"",
                "--no-first-run",
                "--no-default-browser-check",
                // Egen profil, men inte tom: har datorn ett jobbkonto loggar Edge
                // in sig själv i den och synkar ner användarens tillägg. En
                // annonsblockerare som just landat där öppnar sitt "tack för att du
                // använder …" i ett eget fönster ovanpå appen – och tillägg har
                // ingenting att göra på en lokal sida som den här ändå.
                // --disable-sync håller profilen tom, --disable-extensions gör att
                // det som redan hunnit synkas ner aldrig startar.
                "--disable-extensions",
                "--disable-sync",
                "--disable-features=Translate,msEdgeSplitScreen",
                "--window-size=1400,900",
            }))
            {
                UseShellExecute = false,
            };
            using (var browser = Process.Start(info))
            {
                if (job != IntPtr.Zero && browser != null)
                {
                    try { AssignProcessToJobObject(job, browser.Handle); } catch { }
                }
            }

            if (!WaitForAppWindow(true, 60000))
            {
                Fail("PalAssistent kunde inte öppna sitt fönster.\n\n" +
                     "Stäng eventuella rester av programmet och försök igen.");
                return;
            }
            WaitForShutdown(server);
            return;
        }

        // Ingen Edge (i praktiken omöjligt på Windows 11, men programmet ska inte
        // dö av det): öppna standardwebbläsaren. Då kan vi inte se när fönstret
        // stängs, så rutan blir användarens stoppknapp i stället.
        Process.Start(url);
        MessageBox.Show(
            "PalAssistent körs och är öppen i din webbläsare.\n\n" +
            "Klicka OK när du är klar, så stängs programmet.",
            AppName, MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    /// Finns app-fönstret? Vi går igenom ALLA synliga toppnivåfönster och letar
    /// efter ett som både tillhör en msedge-process och har vår titel.
    ///
    /// Det uppenbara – Process.MainWindowTitle – är fel, och felet är otäckt:
    /// hela Edge-profilen är EN process med flera fönster, och .NET ger då
    /// titeln på det som råkar ligga överst i z-ordningen. Lägger sig ett annat
    /// Edge-fönster ovanpå appen – ett tillägg som öppnar sitt "tack för att du
    /// använder …", en utskriftsruta, DevTools – hittar vi plötsligt inget
    /// PalAssistent-fönster alls. WaitForShutdown nedan drar då slutsatsen att
    /// användaren stängt programmet, och 1,2 sekunder senare är servern dödad
    /// och fönstret med den. Symptomet är en app som stänger sig själv strax
    /// efter start, utan felmeddelande, "ibland".
    ///
    /// Att bara leta efter titeln räcker inte heller: Utforskaren får ett fönster
    /// som heter "PalAssistent" så fort någon öppnar installationsmappen, och det
    /// ska definitivt inte hålla servern vid liv. Därför kravet på msedge.
    private static bool AppWindowExists()
    {
        var edge = new HashSet<uint>();
        foreach (Process p in Process.GetProcessesByName("msedge"))
        {
            try { edge.Add((uint)p.Id); }
            catch { /* processen hann avsluta mellan uppräkning och fråga */ }
        }
        if (edge.Count == 0) return false;

        bool found = false;
        // Delegaten ligger i en lokal variabel med flit: skickas den som ett
        // uttryck direkt in i EnumWindows kan skräpsamlaren ta den mitt i anropet.
        EnumWindowsProc scan = delegate(IntPtr window, IntPtr unused)
        {
            uint pid;
            GetWindowThreadProcessId(window, out pid);
            if (edge.Contains(pid) && IsWindowVisible(window) &&
                WindowTitle(window).IndexOf(AppName, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                found = true;
                return false; // hittat – sluta räkna upp
            }
            return true;
        };
        EnumWindows(scan, IntPtr.Zero);
        GC.KeepAlive(scan);
        return found;
    }

    private static string WindowTitle(IntPtr window)
    {
        int length = GetWindowTextLength(window);
        if (length <= 0) return "";
        var text = new StringBuilder(length + 1);
        GetWindowText(window, text, text.Capacity);
        return text.ToString();
    }

    private delegate bool EnumWindowsProc(IntPtr window, IntPtr param);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr param);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr window);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "GetWindowTextLengthW")]
    private static extern int GetWindowTextLength(IntPtr window);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "GetWindowTextW")]
    private static extern int GetWindowText(IntPtr window, StringBuilder text, int max);

    /// Väntar tills app-fönstret finns (present=true) eller är borta (false).
    /// timeoutMs = -1 betyder "så länge som helst", vilket är fallet när vi väntar
    /// på att användaren ska stänga programmet.
    ///
    /// "Borta" måste observeras några gånger i rad. Fönstret kan försvinna ett
    /// ögonblick medan Chromium byter ut det, och en enda observation skulle då
    /// stänga av servern mitt under en omladdning.
    private static bool WaitForAppWindow(bool present, int timeoutMs)
    {
        const int NeededInARow = 3;
        var clock = Stopwatch.StartNew();
        int streak = 0;

        while (timeoutMs < 0 || clock.ElapsedMilliseconds < timeoutMs)
        {
            if (AppWindowExists() == present)
            {
                streak++;
                if (streak >= (present ? 1 : NeededInARow)) return true;
            }
            else
            {
                streak = 0;
            }
            Thread.Sleep(400);
        }
        return false;
    }

    /// Väntar tills användaren stänger fönstret ELLER servern dör.
    ///
    /// Att också vakta servern är vad som gör uppdateringar möjliga: installern
    /// måste stänga servern för att komma åt filerna, och då ska fönstret inte
    /// bli kvar och visa en död sida. När vi returnerar här stängs Edge av
    /// job-objektet, mutexen släpps, och den nya versionen kan starta rent.
    private static void WaitForShutdown(Process server)
    {
        const int NeededInARow = 3;
        int gone = 0;

        while (true)
        {
            if (server.HasExited) return;

            if (AppWindowExists())
            {
                gone = 0;
            }
            else if (++gone >= NeededInARow)
            {
                return;
            }
            Thread.Sleep(400);
        }
    }

    /// Programmet startades fast det redan kör: öppna fönstret på nytt i stället
    /// för att starta en andra server.
    private static void ReopenRunning()
    {
        try
        {
            string port = File.ReadAllText(PortFile).Trim();
            string url = "http://127.0.0.1:" + port + "/";
            string edge = FindEdge();
            if (edge != null)
            {
                Process.Start(new ProcessStartInfo(edge, string.Join(" ", new[]
                {
                    "--app=" + url,
                    "--user-data-dir=\"" + BrowserProfile + "\"",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-extensions",
                    "--disable-sync",
                })) { UseShellExecute = false });
            }
            else
            {
                Process.Start(url);
            }
        }
        catch
        {
            // Portfilen saknas eller är gammal: instansen håller på att avsluta.
            // Att säga något om det vore mer förvirrande än att bara låta bli.
        }
    }

    private static string FindEdge()
    {
        string[] candidates =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                @"Microsoft\Edge\Application\msedge.exe"),
        };
        foreach (string path in candidates)
        {
            if (File.Exists(path)) return path;
        }
        return null;
    }

    // -------------------------------------------------------------- småplock

    private static int FindFreePort()
    {
        for (int port = PortFirst; port <= PortLast; port++)
        {
            if (IsFree(port)) return port;
        }
        return 0;
    }

    private static bool IsFree(int port)
    {
        TcpListener listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
        finally
        {
            if (listener != null) listener.Stop();
        }
    }

    private static string Tail(string text, int max)
    {
        return text.Length <= max ? text : "…" + text.Substring(text.Length - max);
    }

    private static void Fail(string message)
    {
        MessageBox.Show(message, AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
    }

    // ------------------------------------------------------------ job object

    /// Informationsklassen heter samma sak som structen i Windows-API:t, så den
    /// får ett annat namn här – annars krockar de i C#.
    private const int ExtendedLimitInformationClass = 9;
    private const uint JobObjectLimitKillOnJobClose = 0x2000;

    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectBasicLimitInformation
    {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectExtendedLimitInformation
    {
        public JobObjectBasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateJobObject(IntPtr security, string name);

    [DllImport("kernel32.dll")]
    private static extern bool SetInformationJobObject(
        IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll")]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);

    /// Job-objekt vars processer dör när handtaget släpps – alltså när launchern
    /// avslutas, hur den än avslutas.
    private static IntPtr CreateKillOnCloseJob()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) return IntPtr.Zero;

        var limits = new JobObjectExtendedLimitInformation();
        limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;

        int size = Marshal.SizeOf(typeof(JobObjectExtendedLimitInformation));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(limits, buffer, false);
            if (!SetInformationJobObject(job, ExtendedLimitInformationClass, buffer, (uint)size))
            {
                CloseHandle(job);
                return IntPtr.Zero;
            }
            return job;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }
}
