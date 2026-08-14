# Ritar programikonen (app.ico) plus en PNG att titta på.
#
# Habitats basalt-palett: sten i botten, accenten som enda färg – samma tanke
# som i gränssnittet. Appens eget typsnitt går inte att använda här; @fontsource
# levererar bara woff/woff2 och System.Drawing läser varken eller. Därför en
# systemfont i bokstaven och en accentbåge som bär igenkänningen.
#
# ICO:n skrivs för hand: varje storlek som PNG i en ICONDIRENTRY. PNG-poster i
# ICO stöds från Vista och uppåt, och slipper AND-maskens fallgropar.

# Samma ikon skrivs på två ställen och ska alltid vara identiska:
#   app.ico          bakas in i PalCompanion.exe och i installern
#   src/app/favicon.ico   blir ikonen i app-fönstrets titelrad (Edge tar den
#                    från sidans favicon, inte från exe:n)

param(
    [string]$Out = "$PSScriptRoot\app.ico",
    [string]$Favicon = "$(Split-Path -Parent $PSScriptRoot)\src\app\favicon.ico",
    [string]$Preview = "$PSScriptRoot\build\icon-preview.png"
)

Add-Type -AssemblyName System.Drawing

$sizes = 16, 24, 32, 48, 64, 128, 256

function New-IconBitmap([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Rundad kvadrat, samma radieförhållande som --r3 i gränssnittet.
    $r = [Math]::Max(2, [int]($s * 0.22))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $m = 0.0
    $w = $s - 1
    $path.AddArc($m, $m, $d, $d, 180, 90)
    $path.AddArc($w - $d, $m, $d, $d, 270, 90)
    $path.AddArc($w - $d, $w - $d, $d, $d, 0, 90)
    $path.AddArc($m, $w - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $top = [System.Drawing.Color]::FromArgb(255, 32, 36, 43)
    $bottom = [System.Drawing.Color]::FromArgb(255, 14, 16, 19)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point(0, $s)), $top, $bottom)
    $g.FillPath($brush, $path)

    # Tunn accentkant – syns bara från 32 px, under det blir den grus.
    if ($s -ge 32) {
        $pen = New-Object System.Drawing.Pen(
            [System.Drawing.Color]::FromArgb(70, 143, 123, 255), [Math]::Max(1, $s / 64))
        $g.DrawPath($pen, $path)
        $pen.Dispose()
    }

    # Accentstreck under bokstaven. Det satt en båge här först – den blev ett
    # leende och gjorde ikonen till ett ansikte. Rakt streck, inget ansikte.
    if ($s -ge 24) {
        $barW = [float]($s * 0.34)
        $barH = [float]([Math]::Max(2, $s * 0.075))
        $barX = [float](($s - $barW) / 2)
        $barY = [float]($s * 0.70)
        $barBrush = New-Object System.Drawing.SolidBrush(
            [System.Drawing.Color]::FromArgb(255, 143, 123, 255))
        $barPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $bd = $barH
        $barPath.AddArc($barX, $barY, $bd, $bd, 90, 180)
        $barPath.AddArc($barX + $barW - $bd, $barY, $bd, $bd, 270, 180)
        $barPath.CloseFigure()
        $g.FillPath($barBrush, $barPath)
        $barBrush.Dispose(); $barPath.Dispose()
    }

    # Bokstaven. Segoe UI Black finns på alla Windows och är rund nog att inte
    # slåss med formspråket.
    $fontSize = $s * 0.52
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize,
        [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 236, 238, 242))
    # Argumenten måste ligga i egna variabler: skriver man uttrycken direkt i
    # parenteserna läser PowerShell "(0, -$s * 0.04, …)" som en array gånger ett
    # tal och RectangleF-konstruktorn hittas aldrig.
    $rx = [float]0
    $ry = [float](-$s * 0.04)
    $rw = [float]$s
    $rh = [float]$s
    $rect = New-Object System.Drawing.RectangleF($rx, $ry, $rw, $rh)
    $g.DrawString("P", $font, $ink, $rect, $fmt)

    $ink.Dispose(); $font.Dispose(); $fmt.Dispose(); $brush.Dispose(); $path.Dispose(); $g.Dispose()
    return $bmp
}

# --- rendera varje storlek till PNG i minnet ---------------------------------

$pngs = @()
foreach ($s in $sizes) {
    $bmp = New-IconBitmap $s
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += , @{ Size = $s; Bytes = $ms.ToArray() }
    if ($s -eq 256 -and $Preview) {
        $dir = Split-Path -Parent $Preview
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $bmp.Save($Preview, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $ms.Dispose(); $bmp.Dispose()
}

# --- sy ihop ICO-containern --------------------------------------------------

$stream = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter($stream)
$w.Write([UInt16]0)                 # reserverat
$w.Write([UInt16]1)                 # typ 1 = ikon
$w.Write([UInt16]$pngs.Count)

$offset = 6 + 16 * $pngs.Count
foreach ($p in $pngs) {
    $dim = if ($p.Size -ge 256) { 0 } else { $p.Size }   # 0 betyder 256
    $w.Write([Byte]$dim)            # bredd
    $w.Write([Byte]$dim)            # höjd
    $w.Write([Byte]0)               # palettfärger
    $w.Write([Byte]0)               # reserverat
    $w.Write([UInt16]1)             # färgplan
    $w.Write([UInt16]32)            # bitar per pixel
    $w.Write([UInt32]$p.Bytes.Length)
    $w.Write([UInt32]$offset)
    $offset += $p.Bytes.Length
}
foreach ($p in $pngs) { $w.Write($p.Bytes) }
$w.Flush()

$bytes = $stream.ToArray()
[System.IO.File]::WriteAllBytes($Out, $bytes)
$w.Dispose(); $stream.Dispose()

Write-Output "Ikon skriven: $Out ($($pngs.Count) storlekar)"

if ($Favicon) {
    [System.IO.File]::WriteAllBytes($Favicon, $bytes)
    Write-Output "Favicon skriven: $Favicon"
}
if ($Preview) { Write-Output "Forhandsvisning: $Preview" }
