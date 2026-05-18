# Generate a 256x256 ICO file for the MV app launcher
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Rounded square background with purple-to-magenta gradient
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 56
$path.AddArc(0, 0, $radius, $radius, 180, 90)
$path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
$path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
$path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 88, 28, 135),
    [System.Drawing.Color]::FromArgb(255, 219, 39, 119),
    45.0)
$g.FillPath($brush, $path)

# Inner glow ring
$ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), 2)
$g.DrawPath($ringPen, $path)

# Film clapperboard body (white rounded rect, lower 2/3)
$boardRect = New-Object System.Drawing.Rectangle(56, 110, 144, 100)
$boardPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$br = 14
$boardPath.AddArc(56, 110, $br, $br, 180, 90)
$boardPath.AddArc(56 + 144 - $br, 110, $br, $br, 270, 90)
$boardPath.AddArc(56 + 144 - $br, 110 + 100 - $br, $br, $br, 0, 90)
$boardPath.AddArc(56, 110 + 100 - $br, $br, $br, 90, 90)
$boardPath.CloseFigure()
$boardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 250, 252))
$g.FillPath($boardBrush, $boardPath)

# Clapper top diagonal stripes (dark gray + white)
$clapTop = New-Object System.Drawing.Rectangle(56, 78, 144, 36)
$clapBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 30, 40))
$g.FillRectangle($clapBrush, $clapTop)

# Diagonal stripes on clapper
$stripeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 245, 250))
for ($i = 0; $i -lt 5; $i++) {
    $x = 56 + ($i * 32) - 18
    $pts = @(
        (New-Object System.Drawing.Point($x, 78)),
        (New-Object System.Drawing.Point(($x + 18), 78)),
        (New-Object System.Drawing.Point(($x + 36), 114)),
        (New-Object System.Drawing.Point(($x + 18), 114))
    )
    $g.FillPolygon($stripeBrush, $pts)
}

# Music note on the white board area
$noteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 88, 28, 135))
# Note head (ellipse)
$g.FillEllipse($noteBrush, 100, 168, 36, 26)
# Note stem
$stemRect = New-Object System.Drawing.Rectangle(132, 130, 6, 50)
$g.FillRectangle($noteBrush, $stemRect)
# Note flag
$flagPts = @(
    (New-Object System.Drawing.Point(138, 130)),
    (New-Object System.Drawing.Point(160, 142)),
    (New-Object System.Drawing.Point(160, 162)),
    (New-Object System.Drawing.Point(138, 150))
)
$g.FillPolygon($noteBrush, $flagPts)

$g.Dispose()

# Save high-quality PNG first
$pngPath = Join-Path $PSScriptRoot "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "PNG saved: $pngPath"

# Convert to ICO with multi-resolution support by embedding PNG payload
# Modern ICO format supports PNG embedding for sizes >= 64x64
$icoPath = Join-Path $PSScriptRoot "icon.ico"

# Build ICO with multiple sizes: 16, 32, 48, 64, 128, 256
$sizes = @(16, 32, 48, 64, 128, 256)
$images = @()
foreach ($s in $sizes) {
    $resized = New-Object System.Drawing.Bitmap($s, $s)
    $rg = [System.Drawing.Graphics]::FromImage($resized)
    $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $rg.DrawImage($bmp, 0, 0, $s, $s)
    $rg.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $images += ,@{ size = $s; bytes = $ms.ToArray() }
    $resized.Dispose()
    $ms.Dispose()
}

# Write ICONDIR + ICONDIRENTRY headers
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR (6 bytes)
$bw.Write([uint16]0)              # reserved
$bw.Write([uint16]1)              # type = ICO
$bw.Write([uint16]$images.Count)  # image count

# Header is 6 bytes + (16 bytes * count). Image data follows.
$offset = 6 + (16 * $images.Count)
foreach ($img in $images) {
    $s = $img.size
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # width (0 = 256)
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # height
    $bw.Write([byte]0)                # color palette
    $bw.Write([byte]0)                # reserved
    $bw.Write([uint16]1)              # color planes
    $bw.Write([uint16]32)             # bits per pixel
    $bw.Write([uint32]$img.bytes.Length)  # image data size
    $bw.Write([uint32]$offset)        # image data offset
    $offset += $img.bytes.Length
}
foreach ($img in $images) {
    $bw.Write($img.bytes)
}

$bw.Close()
$fs.Close()
$bmp.Dispose()

Write-Host "ICO saved: $icoPath"
Write-Host "Sizes embedded: $($sizes -join ', ')"
