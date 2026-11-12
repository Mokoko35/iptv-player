using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace IptvTest
{
    // Downloads for offline viewing: the page sends "download", "cancelDownload" and "openFolder";
    // this file answers with downloadProgress / downloadComplete / downloadError. Downloads are matched by title.
    public partial class MainWindow
    {
        private const int DownloadStallSeconds = 60; // no data for this long = the download failed
        private static readonly string[] KnownVideoExtensions = { ".mkv", ".mp4", ".avi", ".mov", ".m4v", ".ts", ".wmv", ".flv", ".webm", ".mpg", ".mpeg" };
        private static readonly HttpClient DownloadHttp = CreateDownloadClient();

        private readonly Dictionary<string, CancellationTokenSource> _downloads = new(StringComparer.Ordinal);
        private readonly object _downloadsGate = new();

        // %USERPROFILE%\Videos\IPTV_Indirmeler (MyVideos also follows a Videos folder moved by OneDrive)
        private static string DownloadFolder => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "IPTV_Indirmeler");

        private static HttpClient CreateDownloadClient()
        {
            var handler = new SocketsHttpHandler { AllowAutoRedirect = true, MaxAutomaticRedirections = 8, ConnectTimeout = TimeSpan.FromSeconds(30) };
            var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan }; // a film takes as long as it takes; stalls are caught below
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
            return client;
        }

        // ---------------------------------------------------------------- commands from the page

        private void StartDownload(string url, string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return;
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                PostEvent(new { evt = "downloadError", title, error = "Yalnızca http ve https adresleri indirilebilir." });
                return;
            }

            var cts = new CancellationTokenSource();
            lock (_downloadsGate)
            {
                if (_downloads.ContainsKey(title)) { cts.Dispose(); return; } // already running
                _downloads[title] = cts;
            }
            _ = Task.Run(() => RunDownloadAsync(uri, title, cts));
        }

        private void CancelDownload(string title)
        {
            CancellationTokenSource? cts = null;
            lock (_downloadsGate) _downloads.TryGetValue(title, out cts);
            try { cts?.Cancel(); } catch (ObjectDisposedException) { } // the download task deletes the half file
        }

        private void CancelAllDownloads()
        {
            CancellationTokenSource[] all;
            lock (_downloadsGate) all = _downloads.Values.ToArray();
            foreach (var cts in all) { try { cts.Cancel(); } catch (ObjectDisposedException) { } }
        }

        private void OpenFolder(string path)
        {
            try
            {
                // Only things inside the download folder; the page cannot make this open anything else.
                var root = Path.GetFullPath(DownloadFolder) + Path.DirectorySeparatorChar;
                var full = string.IsNullOrWhiteSpace(path) ? "" : Path.GetFullPath(path);
                if (full.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(full))
                    Process.Start(new ProcessStartInfo("explorer.exe", $"/select,\"{full}\"") { UseShellExecute = true });
                else
                {
                    Directory.CreateDirectory(DownloadFolder);
                    Process.Start(new ProcessStartInfo("explorer.exe", $"\"{DownloadFolder}\"") { UseShellExecute = true });
                }
            }
            catch (Exception ex) { PostEvent(new { evt = "error", message = "Klasör açılamadı: " + ex.Message }); }
        }

        /// <summary>Half files left by a download that was cut off when the app closed. Call once at start.</summary>
        private static void CleanupPartialDownloads()
        {
            try
            {
                if (!Directory.Exists(DownloadFolder)) return;
                foreach (var part in Directory.EnumerateFiles(DownloadFolder, "*.part")) { try { File.Delete(part); } catch { } }
            }
            catch { }
        }

        // ---------------------------------------------------------------- the download itself

        private async Task RunDownloadAsync(Uri uri, string title, CancellationTokenSource userCts)
        {
            string? partPath = null;
            using var stall = CancellationTokenSource.CreateLinkedTokenSource(userCts.Token);
            try
            {
                Directory.CreateDirectory(DownloadFolder);
                stall.CancelAfter(TimeSpan.FromSeconds(DownloadStallSeconds));

                using var response = await DownloadHttp.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, stall.Token);
                if (!response.IsSuccessStatusCode)
                    throw new HttpRequestException($"Sunucu {(int)response.StatusCode} {response.ReasonPhrase} döndürdü.");

                long? total = response.Content.Headers.ContentLength;
                if (total == 0) total = null;

                string finalPath;
                lock (_downloadsGate) // two downloads with the same name must not pick the same file
                {
                    finalPath = UniquePath(DownloadFolder, SafeFileName(title), ExtensionFor(uri, response));
                    partPath = finalPath + ".part";
                    File.Create(partPath).Dispose();
                }

                long received = 0;
                await using (var source = await response.Content.ReadAsStreamAsync(stall.Token))
                await using (var target = new FileStream(partPath, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16, useAsync: true))
                {
                    var buffer = new byte[1 << 16];
                    var clock = Stopwatch.StartNew();
                    long lastReport = -1000;
                    while (true)
                    {
                        int read = await source.ReadAsync(buffer.AsMemory(), stall.Token);
                        if (read == 0) break;
                        await target.WriteAsync(buffer.AsMemory(0, read), stall.Token);
                        received += read;

                        if (clock.ElapsedMilliseconds - lastReport >= 250) // four updates a second are plenty
                        {
                            lastReport = clock.ElapsedMilliseconds;
                            stall.CancelAfter(TimeSpan.FromSeconds(DownloadStallSeconds)); // data is arriving: restart the stall timer
                            PostEvent(new { evt = "downloadProgress", title, progress = Percent(received, total), received, total = total ?? 0L });
                        }
                    }
                    await target.FlushAsync(stall.Token);
                }

                if (total.HasValue && received < total.Value)
                    throw new IOException("İndirme yarıda kesildi: sunucu bağlantıyı erken kapattı.");

                File.Move(partPath, finalPath);
                partPath = null;
                PostEvent(new { evt = "downloadProgress", title, progress = 100.0, received, total = total ?? received });
                PostEvent(new { evt = "downloadComplete", title, path = finalPath, size = new FileInfo(finalPath).Length });
            }
            catch (OperationCanceledException) when (userCts.IsCancellationRequested)
            {
                // Cancelled by the user (or the app is closing). The page already dropped the entry; the finally block deletes the half file.
            }
            catch (OperationCanceledException)
            {
                PostEvent(new { evt = "downloadError", title, error = $"Sunucu {DownloadStallSeconds} saniye boyunca veri göndermedi." });
            }
            catch (Exception ex)
            {
                PostEvent(new { evt = "downloadError", title, error = ex.Message });
            }
            finally
            {
                lock (_downloadsGate)
                {
                    if (_downloads.TryGetValue(title, out var current) && ReferenceEquals(current, userCts)) _downloads.Remove(title);
                }
                if (partPath != null) { try { File.Delete(partPath); } catch { } } // the streams above are closed by now
                userCts.Dispose();
            }
        }

        private static double Percent(long received, long? total) => total.HasValue && total.Value > 0 ? Math.Round(received * 100.0 / total.Value, 1) : 0.0;

        // ---------------------------------------------------------------- file names

        private static string SafeFileName(string title)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var sb = new StringBuilder(title.Length);
            foreach (var ch in title)
            {
                if (ch == '|' || ch == ':') sb.Append(" - ");
                else if (char.IsControl(ch) || Array.IndexOf(invalid, ch) >= 0) sb.Append('_');
                else sb.Append(ch);
            }
            var name = Regex.Replace(sb.ToString(), @"\s+", " ").Trim().TrimEnd('.', ' ');
            if (name.Length > 120) name = name[..120].TrimEnd('.', ' ');
            if (name.Length == 0) name = "indirilen";
            if (Regex.IsMatch(name, @"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$", RegexOptions.IgnoreCase)) name = "_" + name; // names Windows does not allow
            return name;
        }

        private static string ExtensionFor(Uri uri, HttpResponseMessage response)
        {
            var ext = Path.GetExtension(uri.AbsolutePath).ToLowerInvariant();
            if (KnownVideoExtensions.Contains(ext)) return ext;
            return response.Content.Headers.ContentType?.MediaType?.ToLowerInvariant() switch
            {
                "video/x-matroska" => ".mkv",
                "video/mp4" => ".mp4",
                "video/mp2t" => ".ts",
                "video/x-msvideo" => ".avi",
                "video/quicktime" => ".mov",
                "video/webm" => ".webm",
                _ => ".mp4",
            };
        }

        private static string UniquePath(string folder, string name, string ext)
        {
            var path = Path.Combine(folder, name + ext);
            for (int i = 2; File.Exists(path) || File.Exists(path + ".part"); i++)
                path = Path.Combine(folder, $"{name} ({i}){ext}");
            return path;
        }
    }
}
